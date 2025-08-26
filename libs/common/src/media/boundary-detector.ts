import fs from 'fs-extra';
import sharp from 'sharp';

import { calculateColumnScores } from './column-score';
import { extractThumbnail } from './thumb-extractor';

export async function detectLeftBoundaryX(
  inputPath: string,
  width: number,
  height: number,
  opts?: {
    samples?: number;
    minRun?: number;
    satThresh?: number;
    gradThresh?: number;
  },
): Promise<{ x: number | null; debugFramePath?: string }> {
  const samples = opts?.samples ?? 3;
  const minRun = opts?.minRun ?? 5;
  const satT = opts?.satThresh ?? 0.12;
  const gradT = opts?.gradThresh ?? 12;
  const ss = [0.25, 0.5, 0.75].slice(0, samples);

  const scaledW = Math.round((width * 360) / height);
  const accum = new Array<number>(scaledW).fill(0);
  let W = scaledW;
  let debugFramePath: string | undefined;

  for (const r of ss) {
    const png = await extractThumbnail(inputPath, r, 360);
    const image = sharp(png);
    const { data, info } = await image
      .raw()
      .toBuffer({ resolveWithObject: true });
    W = info.width;

    const colScore = calculateColumnScores(data, W, info.height, satT, gradT);
    for (let x = 0; x < W; x++) accum[x] += colScore[x];

    if (!debugFramePath) debugFramePath = png;
    else await fs.remove(png);
  }

  for (let x = 0; x < W; x++) accum[x] /= ss.length;

  const smoothed = smooth(accum, 5); // kernelSize = 5

  console.log(
    'smoothed max/min/avg:',
    Math.max(...smoothed),
    Math.min(...smoothed),
    smoothed.reduce((a, b) => a + b, 0) / smoothed.length,
  );

  console.log(smoothed.map((x) => x.toFixed(1).padStart(4)).join('|'));

  // Scan from right to left
  let run = 0;
  for (let x = W - 1; x >= 0; x--) {
    if (smoothed[x] >= 2.8) {
      run++;
      if (run >= minRun) {
        const xEnd = x + minRun - 1;
        const xRatio = xEnd / W;
        const detectedX = Math.floor(width * xRatio);
        console.log('🏁 final detectedX:', detectedX, 'run count=', run);
        return { x: Math.max(0, detectedX), debugFramePath };
      }
    } else {
      run = 0;
    }
  }
  return { x: null, debugFramePath };
}

function smooth(data: number[], kernelSize: number): number[] {
  const half = Math.floor(kernelSize / 2);
  const result = new Array(data.length).fill(0);
  for (let i = 0; i < data.length; i++) {
    let sum = 0;
    let count = 0;
    for (let j = i - half; j <= i + half; j++) {
      if (j >= 0 && j < data.length) {
        sum += data[j];
        count++;
      }
    }
    result[i] = sum / count;
  }
  return result;
}

export async function detectWhiteBoundaryX(
  inputPath: string,
  width: number,
  height: number,
  opts?: {
    minRun?: number;
    whiteThresh?: number;
  },
): Promise<number | null> {
  const minRun = opts?.minRun ?? 5;
  const whiteT = opts?.whiteThresh ?? 240;

  const thumb = await extractThumbnail(inputPath, 0.5, 360);
  const image = sharp(thumb);
  const { data, info } = await image
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width: W, height: H } = info;

  let run = 0;
  for (let x = W - 1; x >= 0; x--) {
    let sum = 0;
    for (let y = 0; y < H; y++) {
      const idx = (y * W + x) * 3;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const avg = (r + g + b) / 3;
      sum += avg;
    }
    const colAvg = sum / H;
    if (colAvg >= whiteT) {
      run++;
      if (run >= minRun) {
        const xEnd = x + minRun - 1;
        const ratio = xEnd / W;
        const detectedX = Math.floor(width * ratio);
        console.log('✅ detected white region at:', detectedX);
        return detectedX;
      }
    } else {
      run = 0;
    }
  }

  console.warn('❌ No white region detected');
  return null;
}
