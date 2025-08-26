/**
 * 정수를 min ~ max 범위 안으로 클램프(clamp)한다.
 * 소수 입력은 floor() 처리.
 */
export function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.floor(n)));
}
