import * as path from 'node:path';
import {
  BlobSASPermissions,
  BlobServiceClient,
  generateBlobSASQueryParameters,
  SASProtocol,
} from '@azure/storage-blob';
import { Injectable } from '@nestjs/common';
import * as fs from 'fs-extra';
import { LoggerService } from '@app/logger'; // ← 네 전역 LoggerService

const CONN = process.env.AZURE_CONNECTION_STRING!;
const CONTAINER = process.env.AZURE_CONTAINER ?? 'processed';

// 클라이언트 단일 생성
const client = BlobServiceClient.fromConnectionString(CONN);
const normalize = (p: string) => p.replace(/^\/+/, '');

// 확장자 기반 content-type 추정
function guessType(p: string): string {
  const ext = path.extname(p).toLowerCase();
  if (ext === '.mp4') return 'video/mp4';
  if (ext === '.mp3') return 'audio/mpeg';
  if (ext === '.wav') return 'audio/wav';
  if (ext === '.aac') return 'audio/aac';
  if (ext === '.m4a') return 'audio/mp4';
  if (ext === '.json') return 'application/json; charset=utf-8';
  if (ext === '.txt') return 'text/plain; charset=utf-8';
  return 'application/octet-stream';
}

function explainAzureError(e: any) {
  const status = e?.statusCode ?? e?.status;
  const code = e?.details?.errorCode ?? e?.code;
  return `status=${status} code=${code} msg=${e?.message ?? e}`;
}

@Injectable()
export class AzureStorage {
  constructor(private readonly logger: LoggerService) {}

  private readonly container = client.getContainerClient(CONTAINER);

  /**
   * 로컬 파일 업로드 후 읽기 전용 SAS URL 반환
   */
  async uploadFileAndGetSas(
    blobPath: string,
    localPath: string,
    contentType?: string,
    ttlMinutes = 60,
    traceId?: string,
  ): Promise<string> {
    const bp = normalize(blobPath);

    this.logger.debug(
      `[azure] accountUrl=${client.url} container=${this.container.containerName} blobPath=${bp}`,
      'AzureStorage',
    );

    try {
      const created = await this.container.createIfNotExists();
      this.logger.debug(
        `[azure] createIfNotExists=${created.succeeded}`,
        'AzureStorage',
      );
    } catch (e) {
      this.logger.error(
        `[azure] createIfNotExists failed: ${explainAzureError(e)}`,
        e.stack,
        'AzureStorage',
      );
      throw e;
    }

    const exists = await this.container.exists();
    this.logger.debug(`[azure] container.exists()=${exists}`, 'AzureStorage');

    const blob = this.container.getBlockBlobClient(bp);

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
    } catch (e) {
      this.logger.error(
        {
          traceId,
          action: 'azure_upload',
          path: bp,
          status: 'failed',
          latency: Date.now() - start,
          message: explainAzureError(e),
        },
        e.stack,
        'AzureStorage',
      );
      throw e;
    }

    // SAS URL 발급
    return this.getSasUrl(bp, ttlMinutes, blob.url);
  }

  /**
   * 읽기 전용 SAS URL 생성
   */
  getSasUrl(blobPath: string, ttlMinutes = 60, baseUrl?: string): string {
    const bp = normalize(blobPath);
    const startsOn = new Date(Date.now() - 5 * 60_000);
    const expiresOn = new Date(Date.now() + ttlMinutes * 60_000);

    const cred = (client as any).credential;

    const sas = generateBlobSASQueryParameters(
      {
        containerName: this.container.containerName,
        blobName: bp,
        permissions: BlobSASPermissions.parse('r'),
        protocol: SASProtocol.Https,
        startsOn,
        expiresOn,
      },
      cred,
    ).toString();

    const url = baseUrl ?? `${client.url}${this.container.containerName}/${bp}`;
    return `${url}?${sas}`;
  }
}
