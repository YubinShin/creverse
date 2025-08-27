export type AlertChannel = 'slack' | 'discord' | 'generic';

export type AlertNotifyOptions = {
  webhookUrl?: string;
  channel?: AlertChannel;
  traceId?: string;
  extras?: Record<string, unknown>;
};
