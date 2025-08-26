import { PrismaService } from '@app/prisma';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class TraceInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const http = ctx.switchToHttp();
    const req = http.getRequest<Request>();
    const started = Date.now();

    const traceId = pickTraceId(req);

    return next.handle().pipe(
      tap({
        // ✅ Promise를 반환하지 않도록 fire-and-forget로 기록
        next: () => {
          void this.prisma.httpLog
            .create({
              data: {
                uri: (req.originalUrl ?? req.url) || '',
                method: req.method,
                status: 200, // 정책상 200 고정 응답
                latencyMs: Date.now() - started,
                traceId,
              },
            })
            .catch(() => {});
        },
        error: (err: unknown) => {
          const message = err instanceof Error ? err.message : String(err);
          void this.prisma.httpLog
            .create({
              data: {
                uri: (req.originalUrl ?? req.url) || '',
                method: req.method,
                status: 200, // 실패여도 200
                latencyMs: Date.now() - started,
                traceId,
                error: message,
              },
            })
            .catch(() => {});
        },
      }),
    );
  }
}

function pickTraceId(req: Request): string | undefined {
  const headerVal = req.header('x-trace-id');
  if (typeof headerVal === 'string' && headerVal.trim())
    return headerVal.trim();

  // req.traceId가 미들웨어에서 주입될 수 있으니 unknown으로 받아서 내로잉
  const injected = (req as unknown as Record<string, unknown>).traceId;
  if (typeof injected === 'string' && injected.trim()) return injected.trim();

  return undefined;
}
