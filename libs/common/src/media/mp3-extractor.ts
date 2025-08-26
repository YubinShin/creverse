import fs from 'fs-extra';
import { dirname } from 'path';

import { ffmpeg } from './ffmpeg-config';

export async function extractMp3(
  inputVideo: string,
  outputMp3: string,
): Promise<void> {
  await fs.ensureDir(dirname(outputMp3));
  await new Promise<void>((resolve, reject) => {
    let cmd = ffmpeg(inputVideo)
      .noVideo()
      .audioBitrate('192k')
      .outputOptions(['-y'])
      .on('stderr', (line) => console.log('[ffmpeg][audio]', line))
      .on('end', () => resolve())
      .on('error', (e) =>
        reject(e instanceof Error ? e : new Error(String(e))),
      );
    try {
      cmd = cmd.audioCodec('libmp3lame');
    } catch {
      /* fallback */
    }
    cmd.save(outputMp3);
  });
}
