// export function toStartOfDay(dateInput: string | Date) {
//   const d = new Date(dateInput);
//   if (Number.isNaN(+d)) return undefined;
//   d.setHours(0, 0, 0, 0);
//   return d;
// }

// export function toEndOfDay(dateInput: string | Date) {
//   const d = new Date(dateInput);
//   if (Number.isNaN(+d)) return undefined;
//   d.setHours(23, 59, 59, 999);
//   return d;
// }

export function safeDateStart(isoLike: string) {
  // 00:00:00 local 기준 → 필요 시 KST/UTC 정책에 따라 조정
  const d = new Date(isoLike);
  if (Number.isNaN(+d)) return undefined;
  return d;
}

export function safeDateEnd(isoLike: string) {
  const d = new Date(isoLike);
  if (Number.isNaN(+d)) return undefined;
  // 하루 끝까지 포함
  d.setHours(23, 59, 59, 999);
  return d;
}
