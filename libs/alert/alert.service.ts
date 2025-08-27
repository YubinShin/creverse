import { LoggerService } from '@app/logger';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AlertChannel, AlertNotifyOptions } from './types';

@Injectable()
export class AlertService {
  constructor(
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  async notifyOnFailure(
    message: string,
    opts?: AlertNotifyOptions,
  ): Promise<void> {
    const url =
      opts?.webhookUrl ?? this.config.get<string>('ALERT_WEBHOOK_URL');
    if (!url) {
      this.logger.warn(
        `[notifyOnFailure] ALERT_WEBHOOK_URL not set. message: ${message}`,
      );
      return;
    }

    const channel: AlertChannel = opts?.channel ?? 'slack';
    const trace =
      opts?.traceId ?? this.config.get<string>('TRACE_ID') ?? undefined;

    const payload =
      channel === 'slack'
        ? this.buildSlackPayload(message, trace)
        : channel === 'discord'
          ? this.buildDiscordPayload(message, trace)
          : this.buildGenericPayload(message, trace, opts?.extras);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        this.logger.error(
          `[notifyOnFailure] webhook non-2xx ${res.status} ${await this.safeText(res)}`,
        );
      }
    } catch (e) {
      this.logger.error(
        '[notifyOnFailure] webhook error',
        e instanceof Error ? e.message : String(e),
      );
    }
  }

  private buildSlackPayload(message: string, traceId?: string) {
    const text = traceId ? `${message} (traceId: ${traceId})` : message;
    return { text };
  }

  private buildDiscordPayload(message: string, traceId?: string) {
    const content = traceId ? `${message} (traceId: ${traceId})` : message;
    return { content };
  }

  private buildGenericPayload(
    message: string,
    traceId?: string,
    extras?: Record<string, unknown>,
  ) {
    return {
      level: 'error',
      message,
      traceId,
      ...extras,
    };
  }

  private async safeText(res: Response): Promise<string> {
    try {
      return await res.text();
    } catch {
      return '';
    }
  }
}
