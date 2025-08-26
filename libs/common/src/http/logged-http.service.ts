import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { AxiosResponse } from 'axios';
import { Logger as PinoLogger } from 'pino';
import { catchError, lastValueFrom, map, tap } from 'rxjs';

@Injectable()
export class LoggedHttpService {
  constructor(
    private readonly http: HttpService,
    @Inject('LOGGER') private readonly logger: PinoLogger,
  ) {}

  async postWithLog<T = unknown>(
    url: string,
    data: any,
    config: Record<string, any>,
    traceId: string,
    label = 'external-post',
  ): Promise<T> {
    const start = Date.now();

    return await lastValueFrom(
      this.http.post<T>(url, data, config).pipe(
        tap((response) => {
          this.logger.info({
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
          const err = error as Error;
          this.logger.error({
            traceId,
            label,
            url,
            status: 'failed',
            latency: Date.now() - start,
            message: err?.message ?? 'unknown error',
          });
          throw error;
        }),
      ),
    );
  }
}
