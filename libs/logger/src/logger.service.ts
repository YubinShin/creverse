import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import pino, { Logger } from 'pino';

@Injectable()
export class LoggerService implements NestLoggerService {
  protected logger: Logger;
  private traceId?: string;

  constructor() {
    this.logger = pino({
      level: process.env.LOG_LEVEL || 'info',
      transport:
        process.env.NODE_ENV === 'production'
          ? undefined
          : { target: 'pino-pretty', options: { colorize: true } },
      base: undefined,
    });
  }

  setTraceId(traceId: string) {
    this.traceId = traceId;
  }

  log(message: unknown, context?: string) {
    this.logger.info({ ...this.withTrace(message), context });
  }

  error(message: unknown, trace?: string, context?: string) {
    this.logger.error({ ...this.withTrace(message), trace, context });
  }

  warn(message: unknown, context?: string) {
    this.logger.warn({ ...this.withTrace(message), context });
  }

  debug(message: unknown, context?: string) {
    this.logger.debug({ ...this.withTrace(message), context });
  }

  verbose(message: unknown, context?: string) {
    this.logger.trace({ ...this.withTrace(message), context });
  }

  info(message: unknown, context?: string) {
    this.logger.info({ ...this.withTrace(message), context });
  }

  /**
   * Child logger with pre-bound fields (jobId, submissionId 등)
   */
  child(bindings: Record<string, unknown>): LoggerService {
    const childService = new LoggerService();
    childService.logger = this.logger.child(bindings);
    childService.setTraceId(this.traceId ?? '');
    return childService;
  }

  private withTrace(message: unknown): Record<string, unknown> {
    if (typeof message === 'string') {
      return { traceId: this.traceId, message };
    }
    if (typeof message === 'object' && message !== null) {
      return { traceId: this.traceId, ...(message as Record<string, unknown>) };
    }
    return { traceId: this.traceId, message };
  }
}
