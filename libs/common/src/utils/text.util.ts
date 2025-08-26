import { relative } from 'path';

/** submitText에서 하이라이트 구간 배열을 <b>로 감싸 반환 */
export function highlightSubmitText(
  submit: string,
  highlights: Array<{ start: number; end: number }>,
): string {
  if (!submit || !Array.isArray(highlights) || highlights.length === 0)
    return submit;

  // 겹침/역순 방지: 정렬 + 머지
  const ranges = mergeRanges(
    highlights
      .filter(
        (h) =>
          Number.isFinite(h.start) && Number.isFinite(h.end) && h.start < h.end,
      )
      .map((h) => ({
        start: Math.max(0, h.start),
        end: Math.min(submit.length, h.end),
      })),
  );

  let out = '';
  let cursor = 0;
  for (const r of ranges) {
    if (cursor < r.start) out += escapeHtml(submit.slice(cursor, r.start));
    out += '<b>' + escapeHtml(submit.slice(r.start, r.end)) + '</b>';
    cursor = r.end;
  }
  if (cursor < submit.length) out += escapeHtml(submit.slice(cursor));
  return out;
}

function mergeRanges(rs: Array<{ start: number; end: number }>) {
  if (rs.length <= 1) return rs.sort((a, b) => a.start - b.start);
  const sorted = rs.sort((a, b) => a.start - b.start);
  const merged: Array<{ start: number; end: number }> = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    const cur = sorted[i];
    if (cur.start <= last.end) last.end = Math.max(last.end, cur.end);
    else merged.push({ ...cur });
  }
  return merged;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (ch) =>
    ch === '&'
      ? '&amp;'
      : ch === '<'
        ? '&lt;'
        : ch === '>'
          ? '&gt;'
          : ch === '"'
            ? '&quot;'
            : '&#39;',
  );
}

export function normalizeRelative(absPath: string) {
  // 프로젝트 루트 기준 상대경로로 저장 (플랫폼 독립)
  let rel = relative(process.cwd(), absPath);
  // 윈도우 백슬래시 → 슬래시
  rel = rel.split('\\').join('/');
  // 선행 슬래시 제거
  if (rel.startsWith('/')) rel = rel.slice(1);
  return rel; // 예: "uploads/tmp/123-abc.mp4"
}

export function safeParseJson<T>(
  s: string,
): { ok: true; data: T } | { ok: false } {
  try {
    return { ok: true as const, data: JSON.parse(s) as T };
  } catch {
    return { ok: false as const };
  }
}
