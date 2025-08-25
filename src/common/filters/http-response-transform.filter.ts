import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';

type ErrorLikeResponse = {
  message?: string | string[];
  error?: string;
  [key: string]: unknown;
};

@Catch()
export class HttpResponseTransformFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const traceId = req?.traceId ?? null;

    let originalStatus = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal Server Error';

    if (exception instanceof HttpException) {
      originalStatus = exception.getStatus();
      const resp = exception.getResponse();

      if (typeof resp === 'string') {
        message = resp;
      } else if (resp && typeof resp === 'object') {
        const body = resp as ErrorLikeResponse;
        if (Array.isArray(body.message)) {
          message = body.message;
        } else if (typeof body.message === 'string') {
          message = body.message;
        } else if (typeof body.error === 'string') {
          message = body.error;
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // 항상 200으로 래핑
    res.status(200).json({
      result: 'failed' as const,
      message,
      data: null,
      traceId,
      status: originalStatus, // 참고용
    });
  }
}
