import sharp from 'sharp';

export async function drawBoundaryOverlay(
  imagePath: string,
  outputPath: string,
  originalWidth: number,
  detectedX: number,
): Promise<void> {
  const image = sharp(imagePath);
  const { width, height } = await image.metadata();
  if (!width || !height) return;
  const drawX = Math.floor(detectedX * (width / originalWidth));
  const overlay = Buffer.alloc(width * height * 4, 0);
  for (let y = 0; y < height; y++) {
    const i = (y * width + drawX) * 4;
    overlay[i] = 255;
    overlay[i + 1] = 0;
    overlay[i + 2] = 0;
    overlay[i + 3] = 255;
  }
  await image
    .composite([
      { input: overlay, raw: { width, height, channels: 4 }, blend: 'overlay' },
    ])
    .toFile(outputPath);
}
