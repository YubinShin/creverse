// libs/common/http/logged-http.service.ts

import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { AxiosResponse } from 'axios';
import { catchError, lastValueFrom, tap } from 'rxjs';

@Injectable()
export class LoggedHttpService {
  private readonly logger = new Logger(LoggedHttpService.name);

  constructor(private readonly http: HttpService) {}

  async postWithLog<T = any>(
    url: string,
    data: any,
    config: Record<string, any>,
    traceId: string,
    label = 'external-post',
  ): Promise<T> {
    const start = Date.now();
    return await lastValueFrom(
      this.http.post<T>(url, data, config).pipe(
        tap((response: AxiosResponse) => {
          this.logger.log({
            traceId,
            label,
            url,
            status: 'ok',
            statusCode: response.status,
            latency: Date.now() - start,
          });
        }),
        catchError((error) => {
          this.logger.error({
            traceId,
            label,
            url,
            status: 'failed',
            latency: Date.now() - start,
            message: error.message,
          });
          throw error;
        }),
      ),
    );
  }
}
