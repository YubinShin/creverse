export function calculateColumnScores(
  buf: Buffer,
  w: number,
  h: number,
  satT = 0.12,
  gradT = 12,
): number[] {
  const out = new Array<number>(w).fill(0);
  const get = (x: number, y: number) => {
    const i = (y * w + x) * 3;
    const r = buf[i],
      g = buf[i + 1],
      b = buf[i + 2];
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b);
    const s = max === 0 ? 0 : (max - min) / max;
    return { r, g, b, s };
  };
  for (let x = 0; x < w; x++) {
    let satSum = 0,
      gradSum = 0;
    for (let y = 0; y < h; y++) {
      const c = get(x, y);
      satSum += c.s;
      if (x + 1 < w) {
        const n = get(x + 1, y);
        gradSum +=
          Math.abs(c.r - n.r) + Math.abs(c.g - n.g) + Math.abs(c.b - n.b);
      }
    }
    const satAvg = satSum / h;
    const gradAvg = gradSum / (h * 3);
    out[x] = satAvg / satT + gradAvg / gradT;
  }
  return out;
}
