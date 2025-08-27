import { LoggerService } from '@app/logger';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class TraceInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpCtx = context.switchToHttp();
    const req = httpCtx.getRequest<Request & { traceId?: string }>();
    const res = httpCtx.getResponse<Response>();

    // traceId 생성/주입
    const traceId: string =
      (req.headers['x-trace-id'] as string) ?? req.traceId ?? randomUUID();
    req.traceId = traceId;
    res.setHeader('x-trace-id', traceId);

    // LoggerService에 traceId 설정
    this.logger.setTraceId(traceId);

    const start = Date.now();
    return next.handle().pipe(
      tap(() => {
        this.logger.debug(
          `HTTP ${req.method} ${req.url} ${Date.now() - start}ms`,
          'TraceInterceptor',
        );
      }),
    );
  }
}
