export type CropRect = { w: number; h: number; x: number; y: number };

export function sanitizeCropRectForVideo(
  rect: CropRect,
  inW: number,
  inH: number,
): CropRect {
  const x = Math.max(0, Math.min(inW - 2, rect.x));
  const y = Math.max(0, Math.min(inH - 2, rect.y));
  const w = Math.max(2, Math.min(inW - x, rect.w));
  const h = Math.max(2, Math.min(inH - y, rect.h));
  const even = (n: number) => (n & 1 ? n - 1 : n);
  return { x: even(x), y: even(y), w: even(w), h: even(h) };
}
