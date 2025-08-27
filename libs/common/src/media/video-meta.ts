import { execa } from 'execa';

import { FFPROBE_BIN } from './ffmpeg-config';

export async function getVideoSizeFast(
  inputPath: string,
): Promise<{ width: number; height: number }> {
  const { stdout } = await execa(FFPROBE_BIN, [
    '-v',
    'error',
    '-select_streams',
    'v:0',
    '-show_entries',
    'stream=width,height',
    '-of',
    'csv=s=x:p=0',
    inputPath,
  ]);
  const [w, h] = stdout
    .trim()
    .split('x')
    .map((n) => parseInt(n, 10));
  return { width: w || 0, height: h || 0 };
}
