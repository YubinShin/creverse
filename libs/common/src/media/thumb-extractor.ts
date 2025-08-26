import { execa } from 'execa';
import { tmpdir } from 'os';
import { join } from 'path';

import { FFMPEG_BIN, FFPROBE_BIN } from './ffmpeg-config';

export async function extractThumbnail(
  input: string,
  rel: number,
  targetH = 360,
): Promise<string> {
  const out = join(
    tmpdir(),
    `thumb-${Math.random().toString(36).slice(2)}.png`,
  );
  const { stdout: durRaw } = await execa(FFPROBE_BIN, [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'default=nw=1:nk=1',
    input,
  ]);
  const duration = Math.max(0.0, parseFloat(durRaw || '0'));
  const ss =
    duration > 0 ? Math.max(0, Math.min(duration * rel, duration - 0.05)) : 0;
  await execa(FFMPEG_BIN, [
    ...(ss ? ['-ss', String(ss)] : []),
    '-i',
    input,
    '-vf',
    `scale=-2:${targetH}`,
    '-vframes',
    '1',
    '-y',
    out,
  ]);
  return out;
}
