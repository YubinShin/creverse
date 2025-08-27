import { relative } from 'path';

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** submitText에서 하이라이트 구간 배열을 <b>로 감싸 반환 */

// 문자열 목록으로 하이라이트 (겹침 최소화, 간단 매칭)
export function highlightHtmlByStrings(text: string, items: string[]) {
  if (!text || !items?.length) return escapeHtml(text);

  const needles = [
    ...new Set(items.map((s) => s?.trim()).filter(Boolean)),
  ].sort((a, b) => b.length - a.length);

  let out = escapeHtml(text);
  for (const n of needles) {
    const esc = escapeRegExp(n);
    out = out.replace(new RegExp(esc, 'g'), (m) => `<b>${escapeHtml(m)}</b>`);
  }
  return out;
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
export function safeToString(v: unknown): string {
  if (
    typeof v === 'string' ||
    typeof v === 'number' ||
    typeof v === 'boolean'
  ) {
    return String(v);
  }
  if (v instanceof Error) {
    return v.message;
  }
  if (v) return JSON.stringify(v);
  return '-';
}
