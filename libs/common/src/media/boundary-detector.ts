import sharp from 'sharp';

import { extractThumbnail } from './thumb-extractor';

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

        return detectedX;
      }
    } else {
      run = 0;
    }
  }

  return null;
}
