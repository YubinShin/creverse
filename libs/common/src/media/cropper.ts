import fs from 'fs-extra';
import { dirname } from 'path';

import type { CropRect } from './crop-utils';
import { ffmpeg } from './ffmpeg-config';
import { getVideoSizeFast } from './video-meta';

export async function cropVideo(
  inputPath: string,
  outputPath: string,
  rect: CropRect,
): Promise<void> {
  const { width, height } = await getVideoSizeFast(inputPath);
  const x = Math.max(0, Math.floor(rect.x));
  const y = Math.max(0, Math.floor(rect.y));
  const w = Math.max(1, Math.min(Math.floor(rect.w), width - x));
  const h = Math.max(1, Math.min(Math.floor(rect.h), height - y));
  await fs.ensureDir(dirname(outputPath));
  await new Promise<void>((resolve, reject) => {
    ffmpeg(inputPath)
      .videoFilter(`crop=${w}:${h}:${x}:${y}`)
      .noAudio()
      .outputOptions(['-y'])
      .on('end', () => resolve())
      .on('error', (e) => reject(e instanceof Error ? e : new Error(String(e))))
      .save(outputPath);
  });
}
