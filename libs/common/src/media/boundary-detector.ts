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
    blurSigma?: number;
  },
): Promise<{ x: number | null; debugFramePath?: string }> {
  const samples = opts?.samples ?? 3;
  const minRun = opts?.minRun ?? 8;
  const satT = opts?.satThresh ?? 0.12;
  const gradT = opts?.gradThresh ?? 12;
  const blurSigma = opts?.blurSigma ?? 2.0;
  const ss = [0.25, 0.5, 0.75].slice(0, samples);

  const scaledW = Math.round((width * 360) / height);
  const accum = new Array<number>(scaledW).fill(0);
  let W = scaledW;
  let debugFramePath: string | undefined;

  for (const r of ss) {
    const png = await extractThumbnail(inputPath, r, 360);
    const blurred = sharp(png).blur(blurSigma);
    const { data, info } = await blurred
      .raw()
      .toBuffer({ resolveWithObject: true });
    W = info.width;
    const colScore = calculateColumnScores(
      data,
      info.width,
      info.height,
      satT,
      gradT,
    );
    for (let x = 0; x < W; x++) accum[x] += colScore[x];
    if (!debugFramePath) debugFramePath = png;
    else await fs.remove(png);
  }

  for (let x = 0; x < W; x++) accum[x] /= ss.length;

  let run = 0;
  for (let x = W - 1; x >= 0; x--) {
    if (accum[x] >= 1.0) {
      run++;
      if (run >= minRun) {
        const xRatio = (x + minRun - 1) / W;
        return { x: Math.max(0, Math.floor(width * xRatio)), debugFramePath };
      }
    } else {
      run = 0;
    }
  }
  return { x: null, debugFramePath };
}
