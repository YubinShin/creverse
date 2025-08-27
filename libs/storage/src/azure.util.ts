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
    const bp = normalize(blobPath);

    try {
      const created = await this.containerClient.createIfNotExists();
      this.logger.debug(
        `[azure] createIfNotExists=${created.succeeded}`,
        'AzureStorage',
      );
    } catch (e: unknown) {
      const err = e as Error;
      this.logger.error(
        `[azure] createIfNotExists failed: ${explainAzureError(err)}`,
        err.stack,
        'AzureStorage',
      );
      throw err;
    }

    const exists = await this.containerClient.exists();
    this.logger.debug(`[azure] container.exists()=${exists}`, 'AzureStorage');

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

      this.logger.log(
        {
          traceId,
          action: 'azure_upload',
          path: bp,
          status: 'ok',
          latency: Date.now() - start,
        },
        'AzureStorage',
      );
    } catch (e: unknown) {
      const err = e as Error;
      this.logger.error(
        {
          traceId,
          action: 'azure_upload',
          path: bp,
          status: 'failed',
          latency: Date.now() - start,
          message: explainAzureError(err),
        },
        err.stack,
        'AzureStorage',
      );
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
