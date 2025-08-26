// import { execa } from 'execa';
// import ffmpegStatic from 'ffmpeg-static';
// import ffprobeStatic from 'ffprobe-static';
// import ffmpeg, { FfprobeData } from 'fluent-ffmpeg';
// import * as fs from 'fs/promises';
// import { tmpdir } from 'os';
// import { dirname, join } from 'path';
// import sharp from 'sharp';

import { execa } from 'execa';
import { FFPROBE_BIN } from './ffmpeg-config';

// const FFMPEG_BIN = ffmpegStatic ?? 'ffmpeg';
// const FFPROBE_BIN = ffprobeStatic?.path ?? 'ffprobe';

// if (ffmpegStatic) {
//   // ffmpeg-static: string | null
//   ffmpeg.setFfmpegPath(ffmpegStatic);
// }
// if (ffprobeStatic?.path) {
//   ffmpeg.setFfprobePath(ffprobeStatic.path);
// }

// export type CropRect = { w: number; h: number; x: number; y: number };

// export async function ensureDir(dir: string) {
//   await fs.mkdir(dir, { recursive: true });
// }

// export async function probeVideoResolution(
//   inputPath: string,
// ): Promise<{ width: number; height: number }> {
//   return new Promise((resolve, reject) => {
//     ffmpeg.ffprobe(inputPath, (err: Error | null, data: FfprobeData) => {
//       if (err) return reject(err);
//       const stream = data.streams.find((s) => s.codec_type === 'video');
//       const width = Number(stream?.width ?? 0);
//       const height = Number(stream?.height ?? 0);
//       if (!width || !height) {
//         return reject(new Error('failed to read video resolution'));
//       }
//       resolve({ width, height });
//     });
//   });
// }

// /**
//  * 왼쪽 영역을 px 또는 비율로 제거할 때의 crop rect 계산
//  */
// export function buildLeftCropRect(
//   width: number,
//   height: number,
//   options?: { leftPx?: number; leftRatio?: number; fallbackRatio?: number },
// ): CropRect {
//   const leftPx =
//     Number.isFinite(options?.leftPx) && typeof options?.leftPx === 'number'
//       ? Math.max(0, Math.floor(options.leftPx))
//       : NaN;

//   const leftRatioRaw =
//     Number.isFinite(options?.leftRatio) &&
//     typeof options?.leftRatio === 'number'
//       ? options.leftRatio
//       : NaN;

//   const fallbackRatio =
//     Number.isFinite(options?.fallbackRatio) &&
//     typeof options?.fallbackRatio === 'number'
//       ? options.fallbackRatio
//       : 0.17;

//   const ratio = !Number.isNaN(leftRatioRaw)
//     ? clamp(leftRatioRaw, 0, 0.9)
//     : fallbackRatio;
//   const cutPx = !Number.isNaN(leftPx) ? leftPx : Math.floor(width * ratio);

//   const x = clamp(cutPx, 0, width - 1);
//   const w = Math.max(1, width - x);
//   return { w, h: height, x, y: 0 };
// }

// export async function cropVideo(
//   inputPath: string,
//   outputPath: string,
//   rect: CropRect,
// ) {
//   const { width, height } = await getVideoSize(inputPath);
//   const x = Math.max(0, Math.floor(rect.x));
//   const y = Math.max(0, Math.floor(rect.y));
//   const w = Math.max(1, Math.min(Math.floor(rect.w), width - x));
//   const h = Math.max(1, Math.min(Math.floor(rect.h), height - y));

//   await ensureDir(dirname(outputPath));
//   await new Promise<void>((resolve, reject) => {
//     ffmpeg(inputPath)
//       .videoFilter(`crop=${w}:${h}:${x}:${y}`)
//       .noAudio()
//       .outputOptions(['-y'])
//       .on('start', (cmd) => console.log('[FFmpeg cmd]', cmd))
//       .on('end', () => resolve())
//       .on('error', (e) => reject(e instanceof Error ? e : new Error(String(e))))
//       .save(outputPath);
//   });
// }

// export async function extractMp3(inputVideo: string, outputMp3: string) {
//   await ensureDir(dirname(outputMp3));
//   await new Promise<void>((resolve, reject) => {
//     let cmd = ffmpeg(inputVideo)
//       .noVideo()
//       .audioBitrate('192k')
//       .outputOptions(['-y'])
//       .on('stderr', (line) => console.log('[ffmpeg][audio]', line))
//       .on('end', () => resolve())
//       .on('error', (e) =>
//         reject(e instanceof Error ? e : new Error(String(e))),
//       );

//     try {
//       cmd = cmd.audioCodec('libmp3lame');
//     } catch {
//       /* noop */
//     }
//     cmd.save(outputMp3);
//   });
// }

// function clamp(n: number, min: number, max: number) {
//   return Math.max(min, Math.min(max, n));
// }

// export function sanitizeCropRectForVideo(
//   rect: CropRect,
//   inW: number,
//   inH: number,
// ): CropRect {
//   const x = Math.max(0, Math.min(inW - 2, rect.x));
//   const y = Math.max(0, Math.min(inH - 2, rect.y));
//   const w = Math.max(2, Math.min(inW - x, rect.w));
//   const h = Math.max(2, Math.min(inH - y, rect.h));

//   // yuv420 계열 코덱 호환 위해 짝수 픽셀로 정리
//   const even = (n: number) => (n & 1 ? n - 1 : n);
//   return { x: even(x), y: even(y), w: even(w), h: even(h) };
// }

// export async function probeHasAudio(inputPath: string): Promise<boolean> {
//   return new Promise((resolve, reject) => {
//     ffmpeg.ffprobe(inputPath, (err, data) => {
//       if (err)
//         return reject(err instanceof Error ? err : new Error(String(err)));
//       resolve((data.streams ?? []).some((s) => s.codec_type === 'audio'));
//     });
//   });
// }

// export async function detectLeftBoundaryX(
//   inputPath: string,
//   opts?: {
//     samples?: number;
//     minRun?: number;
//     satThresh?: number;
//     gradThresh?: number;
//     blurSigma?: number;
//   },
// ): Promise<number | null> {
//   const samples = opts?.samples ?? 3;
//   const minRun = opts?.minRun ?? 8;
//   const satT = opts?.satThresh ?? 0.12;
//   const gradT = opts?.gradThresh ?? 12;
//   const blurSigma = opts?.blurSigma ?? 2.0;

//   const { width, height } = await getVideoSize(inputPath);
//   if (!width || !height) return null;

//   const tgtH = 360;
//   const ss = [0.25, 0.5, 0.75].slice(0, samples);
//   const accum = new Array<number>(Math.round((width * tgtH) / height)).fill(0);
//   let W = accum.length;

//   let detectedX: number | null = null;

//   for (const r of ss) {
//     const png = await extractThumb(inputPath, r, tgtH);
//     const originalDebugPath = `debug_original_${Math.round(r * 100)}.png`;
//     const blurredDebugPath = `debug_blurred_${Math.round(r * 100)}.png`;

//     await sharp(png).toFile(originalDebugPath);

//     const blurred = sharp(png).blur(blurSigma);
//     await blurred.toFile(blurredDebugPath);

//     const { data, info } = await blurred
//       .raw()
//       .toBuffer({ resolveWithObject: true });

//     W = info.width;

//     const colScore = columnActivityScore(
//       data,
//       info.width,
//       info.height,
//       satT,
//       gradT,
//     );

//     for (let x = 0; x < W; x++) accum[x] += colScore[x];

//     await fs.unlink(png).catch(() => {});
//   }

//   for (let x = 0; x < W; x++) accum[x] /= ss.length;

//   const thr = 1.0;
//   let run = 0;
//   for (let x = W - 1; x >= 0; x--) {
//     if (accum[x] >= thr) {
//       run++;
//       if (run >= minRun) {
//         const xRatio = (x + minRun - 1) / W;
//         detectedX = Math.max(0, Math.floor(width * xRatio));
//         break;
//       }
//     } else {
//       run = 0;
//     }
//   }

//   // 🔴 시각화 이미지 생성
//   if (detectedX !== null) {
//     const visSample = ss[Math.floor(ss.length / 2)];
//     const blurredDebugPath = `debug_blurred_${Math.round(visSample * 100)}.png`;
//     const resultPath = `debug_result_${Math.round(visSample * 100)}.png`;

//     const blurredImage = sharp(blurredDebugPath);
//     const { width: debugW, height: debugH } = await blurredImage.metadata();

//     const drawX = Math.floor(detectedX * (debugW / width));

//     const overlayBuffer = Buffer.alloc(debugW * debugH * 4, 0);
//     for (let y = 0; y < debugH; y++) {
//       const i = (y * debugW + drawX) * 4;
//       overlayBuffer[i] = 255; // R
//       overlayBuffer[i + 1] = 0; // G
//       overlayBuffer[i + 2] = 0; // B
//       overlayBuffer[i + 3] = 255; // A
//     }

//     await blurredImage
//       .composite([
//         {
//           input: overlayBuffer,
//           raw: { width: debugW, height: debugH, channels: 4 },
//           blend: 'overlay',
//         },
//       ])
//       .toFile(resultPath);
//   }

//   return detectedX;
// }

// function columnActivityScore(
//   buf: Buffer,
//   w: number,
//   h: number,
//   satT = 0.12,
//   gradT = 12,
// ): number[] {
//   const out = new Array<number>(w).fill(0);
//   const get = (x: number, y: number) => {
//     const i = (y * w + x) * 3;
//     const r = buf[i],
//       g = buf[i + 1],
//       b = buf[i + 2];
//     const max = Math.max(r, g, b),
//       min = Math.min(r, g, b);
//     const s = max === 0 ? 0 : (max - min) / max;
//     return { r, g, b, s };
//   };

//   for (let x = 0; x < w; x++) {
//     let satSum = 0;
//     let gradSum = 0;
//     for (let y = 0; y < h; y++) {
//       const c = get(x, y);
//       satSum += c.s;
//       if (x + 1 < w) {
//         const n = get(x + 1, y);
//         gradSum +=
//           Math.abs(c.r - n.r) + Math.abs(c.g - n.g) + Math.abs(c.b - n.b);
//       }
//     }
//     const satAvg = satSum / h; // 0..1
//     const gradAvg = gradSum / (h * 3); // ~0..255
//     // Normalize so “= threshold” ≈ 1 each, then sum
//     const score = satAvg / satT + gradAvg / gradT;
//     out[x] = score;
//   }
//   return out;
// }

// async function extractThumb(input: string, rel: number, targetH = 360) {
//   const out = join(
//     tmpdir(),
//     `thumb-${Math.random().toString(36).slice(2)}.png`,
//   );
//   const { stdout: durRaw } = await execa(FFPROBE_BIN, [
//     '-v',
//     'error',
//     '-show_entries',
//     'format=duration',
//     '-of',
//     'default=nw=1:nk=1',
//     input,
//   ]);
//   const duration = Math.max(0.0, parseFloat(durRaw || '0'));
//   const ss =
//     isFinite(duration) && duration > 0
//       ? Math.max(0, Math.min(duration * rel, duration - 0.05))
//       : 0;
//   await execa(FFMPEG_BIN, [
//     ...(ss ? ['-ss', String(ss)] : []),
//     '-i',
//     input,
//     '-vf',
//     `scale=-2:${targetH}`,
//     '-vframes',
//     '1',
//     '-y',
//     out,
//   ]);
//   return out;
// // }

// export async function getVideoSize(
//   file: string,
// ): Promise<{ width: number; height: number }> {
//   const { stdout } = await execa(FFPROBE_BIN, [
//     '-v',
//     'error',
//     '-select_streams',
//     'v:0',
//     '-show_entries',
//     'stream=width,height',
//     '-of',
//     'csv=s=x:p=0',
//     file,
//   ]);
//   const [w, h] = stdout
//     .trim()
//     .split('x')
//     .map((n) => parseInt(n, 10));
//   return { width: w || 0, height: h || 0 };
// }
