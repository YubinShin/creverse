export type AlertChannel = 'slack' | 'discord' | 'generic';

type NotifyOptions = {
  /** 웹훅 URL (없으면 ENV 사용) */
  webhookUrl?: string;
  /** 채널 타입 (기본 slack) */
  channel?: AlertChannel;
  /** 트레이스/상관관계 ID */
  traceId?: string;
  /** 추가 필드 (generic payload에 병합) */
  extras?: Record<string, unknown>;
};

/**
 * 실패 알림 전송 (fire-and-forget 가능)
 * - Slack: { text }
 * - Discord: { content }
 * - Generic: { message, level, traceId, ...extras }
 */
export async function notifyOnFailure(
  message: string,
  opts?: NotifyOptions,
): Promise<void> {
  const url = opts?.webhookUrl ?? process.env.ALERT_WEBHOOK_URL;
  if (!url) {
    // 웹훅이 설정 안 된 경우엔 콘솔로만 남김

    console.warn(
      '[notifyOnFailure] ALERT_WEBHOOK_URL not set. message:',
      message,
    );
    return;
  }

  const channel: AlertChannel = opts?.channel ?? 'slack';
  const trace = opts?.traceId ?? process.env.TRACE_ID ?? undefined;

  const payload =
    channel === 'slack'
      ? buildSlackPayload(message, trace)
      : channel === 'discord'
        ? buildDiscordPayload(message, trace)
        : buildGenericPayload(message, trace, opts?.extras);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      // Slack/Discord는 2xx만 성공
    });
    if (!res.ok) {
      console.error(
        '[notifyOnFailure] webhook non-2xx',
        res.status,
        await safeText(res),
      );
    }
  } catch (e: unknown) {
    console.error(
      '[notifyOnFailure] webhook error',
      e instanceof Error ? e.message : String(e),
    );
  }
}

function buildSlackPayload(message: string, traceId?: string) {
  const text = traceId ? `${message} (traceId: ${traceId})` : message;
  return { text };
}

function buildDiscordPayload(message: string, traceId?: string) {
  const content = traceId ? `${message} (traceId: ${traceId})` : message;
  return { content };
}

function buildGenericPayload(
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

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '';
  }
}
