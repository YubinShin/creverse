import { LoggerService } from '@app/logger';
import {
  BlobSASPermissions,
  BlobServiceClient,
  generateBlobSASQueryParameters,
  SASProtocol,
  StorageSharedKeyCredential,
} from '@azure/storage-blob';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs-extra';

import { explainAzureError, guessType, normalize } from './utils/storage.utils';

@Injectable()
export class AzureStorage {
  private readonly containerClient;

  constructor(
    private readonly logger: LoggerService,
    private readonly config: ConfigService,
  ) {
    const conn = this.config.getOrThrow<string>('storage.connectionString');
    const container = this.config.getOrThrow<string>('storage.container');

    const client = BlobServiceClient.fromConnectionString(conn);
    this.containerClient = client.getContainerClient(container);
  }

  async uploadFileAndGetSas(
    blobPath: string,
    localPath: string,
    contentType?: string,
    ttlMinutes = 60,
    traceId?: string,
  ): Promise<string> {
    const log = this.logger.child({ traceId, context: 'AzureStorage' }); // ✅ 안전하게 child logger 사용
    const bp = normalize(blobPath);

    try {
      const created = await this.containerClient.createIfNotExists();
      log.debug({ action: 'createIfNotExists', result: created.succeeded });
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      log.error({
        action: 'createIfNotExists',
        status: 'failed',
        message: explainAzureError(err),
        stack: err.stack,
      });
      throw err;
    }

    const exists = await this.containerClient.exists();
    log.debug({ action: 'container.exists', result: exists });

    const blob = this.containerClient.getBlockBlobClient(bp);

    // 로컬 파일 확인
    const stat = await fs.stat(localPath).catch(() => null);
    if (!stat?.isFile()) throw new Error(`Local file not found: ${localPath}`);

    const start = Date.now();

    try {
      await blob.uploadFile(localPath, {
        blobHTTPHeaders: {
          blobContentType: contentType || guessType(localPath),
          blobCacheControl: 'public, max-age=300',
        },
      });

      log.info({
        action: 'azure_upload',
        path: bp,
        status: 'ok',
        latency: Date.now() - start,
      });
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      log.error({
        action: 'azure_upload',
        path: bp,
        status: 'failed',
        latency: Date.now() - start,
        message: explainAzureError(err),
        stack: err.stack,
      });
      throw err;
    }

    return this.getSasUrl(bp, ttlMinutes, blob.url);
  }

  getSasUrl(blobPath: string, ttlMinutes = 60, baseUrl?: string): string {
    const bp = normalize(blobPath);
    const startsOn = new Date(Date.now() - 5 * 60_000);
    const expiresOn = new Date(Date.now() + ttlMinutes * 60_000);

    const client = this.containerClient;
    const cred = (
      client as unknown as { credential?: StorageSharedKeyCredential }
    ).credential;
    if (!cred) throw new Error('Storage client credential is missing');

    const sas = generateBlobSASQueryParameters(
      {
        containerName: this.containerClient.containerName,
        blobName: bp,
        permissions: BlobSASPermissions.parse('r'),
        protocol: SASProtocol.Https,
        startsOn,
        expiresOn,
      },
      cred,
    ).toString();

    const url =
      baseUrl ?? `${client.url}${this.containerClient.containerName}/${bp}`;
    return `${url}?${sas}`;
  }
}
