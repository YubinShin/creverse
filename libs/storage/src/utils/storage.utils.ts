import * as path from 'node:path';

import { safeToString } from '@app/common';

export const normalize = (p: string): string => p.replace(/^\/+/, '');

export const guessType = (p: string): string => {
  const ext = path.extname(p).toLowerCase();
  if (ext === '.mp4') return 'video/mp4';
  if (ext === '.mp3') return 'audio/mpeg';
  if (ext === '.wav') return 'audio/wav';
  if (ext === '.aac') return 'audio/aac';
  if (ext === '.m4a') return 'audio/mp4';
  if (ext === '.json') return 'application/json; charset=utf-8';
  if (ext === '.txt') return 'text/plain; charset=utf-8';
  return 'application/octet-stream';
};

export function explainAzureError(e: unknown): string {
  if (typeof e === 'string') return e;

  if (e instanceof Error) {
    const err = e as Error & {
      statusCode?: unknown;
      status?: unknown;
      code?: unknown;
      details?: { errorCode?: unknown };
    };

    return `status=${safeToString(err.statusCode ?? err.status)}, code=${safeToString(err.details?.errorCode ?? err.code)}, msg=${safeToString(err.message)}`;
  }

  if (typeof e === 'object' && e !== null) {
    const obj = e as Record<string, unknown>;
    return `status=${safeToString(obj['status'])}, code=${safeToString(obj['code'])}, msg=${safeToString(obj['message'] ?? obj)}`;
  }

  return safeToString(e);
}
