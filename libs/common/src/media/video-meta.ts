import { execa } from 'execa';

import { ffmpeg, FFPROBE_BIN } from './ffmpeg-config';

// export async function getVideoResolution(
//   inputPath: string,
// ): Promise<{ width: number; height: number }> {
//   return new Promise((resolve, reject) => {
//     ffmpeg.ffprobe(inputPath, (err, data) => {
//       if (err) return reject(err);
//       const stream = data.streams.find((s) => s.codec_type === 'video');
//       const width = Number(stream?.width ?? 0);
//       const height = Number(stream?.height ?? 0);
//       if (!width || !height)
//         return reject(new Error('failed to read video resolution'));
//       resolve({ width, height });
//     });
//   });
// }

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

// export async function hasAudioStream(inputPath: string): Promise<boolean> {
//   return new Promise((resolve, reject) => {
//     ffmpeg.ffprobe(inputPath, (err, data) => {
//       if (err) return reject(err);
//       resolve((data.streams ?? []).some((s) => s.codec_type === 'audio'));
//     });
//   });
// }
