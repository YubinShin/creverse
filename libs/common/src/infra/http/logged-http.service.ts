// libs/common/src/infra/http/logged-http.service.ts
import { LoggerService } from '@app/logger';
import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { AxiosResponse, isAxiosError } from 'axios';
import { catchError, lastValueFrom, map, tap } from 'rxjs';

@Injectable()
export class LoggedHttpService {
  constructor(
    private readonly http: HttpService,
    private readonly logger: LoggerService,
  ) {}

  async postWithLog<T = unknown>(
    url: string,
    data: unknown,
    config: Record<string, unknown>,
    traceId?: string,
    label = 'external-post',
  ): Promise<T> {
    const start = Date.now();

    return await lastValueFrom(
      this.http.post<T>(url, data, config).pipe(
        tap((response) => {
          this.logger.log({
            traceId,
            label,
            url,
            status: 'ok',
            statusCode: response.status,
            latency: Date.now() - start,
          });
        }),
        map((response: AxiosResponse<T>) => response.data),
        catchError((error: unknown) => {
          const { message, stack, statusCode } = this.formatError(error);

          this.logger.error({
            traceId,
            label,
            url,
            status: 'failed',
            statusCode,
            latency: Date.now() - start,
            message,
            stack,
          });

          throw error;
        }),
      ),
    );
  }

  /** HEAD 요청 (예: SAS URL 검증) */
  async headWithLog(
    url: string,
    config: Record<string, unknown> = {},
    traceId?: string,
    label = 'external-head',
  ): Promise<{ status: number; len: string | null }> {
    const start = Date.now();

    return await lastValueFrom(
      this.http.head(url, config).pipe(
        tap((response) => {
          this.logger.log({
            traceId,
            label,
            url,
            status: 'ok',
            statusCode: response.status,
            latency: Date.now() - start,
          });
        }),
        map((response: AxiosResponse) => ({
          status: response.status,
          len:
            (response.headers['content-length'] as string | undefined) ?? null, // ✅ 타입 단언
        })),
        catchError((error: unknown) => {
          const { message, stack, statusCode } = this.formatError(error);

          this.logger.error({
            traceId,
            label,
            url,
            status: 'failed',
            statusCode,
            latency: Date.now() - start,
            message,
            stack,
          });

          throw error;
        }),
      ),
    );
  }

  /** error 안전하게 파싱 */
  private formatError(error: unknown): {
    message: string;
    stack?: string;
    statusCode?: number;
  } {
    if (isAxiosError(error)) {
      return {
        message: error.message,
        stack: error.stack,
        statusCode: error.response?.status,
      };
    }
    if (error instanceof Error) {
      return { message: error.message, stack: error.stack };
    }
    return { message: String(error) };
  }
}
