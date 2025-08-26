export type CropRect = { w: number; h: number; x: number; y: number };

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function calculateLeftCropRectFromRatio(
  width: number,
  height: number,
  options?: { leftPx?: number; leftRatio?: number; fallbackRatio?: number },
): CropRect {
  const leftPx = Number.isFinite(options?.leftPx)
    ? Math.floor(options.leftPx!)
    : NaN;
  const leftRatio = Number.isFinite(options?.leftRatio)
    ? options.leftRatio!
    : NaN;
  const fallback = Number.isFinite(options?.fallbackRatio)
    ? options.fallbackRatio!
    : 0.17;
  const ratio = !Number.isNaN(leftRatio) ? clamp(leftRatio, 0, 0.9) : fallback;
  const cutPx = !Number.isNaN(leftPx) ? leftPx : Math.floor(width * ratio);
  const x = clamp(cutPx, 0, width - 1);
  const w = Math.max(1, width - x);
  return { w, h: height, x, y: 0 };
}

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
