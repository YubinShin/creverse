import { relative } from 'path';

export function toProjectRelative(absPath: string) {
  let rel = relative(process.cwd(), absPath);
  rel = rel.split('\\').join('/'); // win → posix
  if (rel.startsWith('/')) rel = rel.slice(1);
  return rel;
}
