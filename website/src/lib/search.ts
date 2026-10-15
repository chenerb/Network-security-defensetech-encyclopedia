import type { DocumentKind, SearchEntry, SearchResult } from '../types';

export function searchDocuments(
  query: string,
  entries: SearchEntry[],
  kind?: DocumentKind,
): SearchResult[] {
  const words = [
    ...new Set(
      query.normalize('NFKC').trim().toLocaleLowerCase().slice(0, 256).split(/\s+/).filter(Boolean),
    ),
  ];
  if (!words.length) return [];
  const results: SearchResult[] = [];
  for (const entry of entries) {
    if (kind && entry.kind !== kind) continue;
    const title = entry.title.normalize('NFKC').toLocaleLowerCase();
    const text = entry.text.normalize('NFKC').toLocaleLowerCase();
    if (!words.every((word) => title.includes(word) || text.includes(word))) continue;
    const start = Math.max(0, text.indexOf(words[0]) - 38);
    const snippet =
      (start ? '…' : '') +
      entry.text.slice(start, start + 138).replace(/\s+/g, ' ') +
      (entry.text.length > start + 138 ? '…' : '');
    const score =
      words.reduce((sum, word) => sum + (title.includes(word) ? 100 : 1), 0) +
      (entry.kind === 'lesson' ? 5 : 0);
    results.push({ entry, snippet, score });
  }
  return results
    .sort((a, b) => b.score - a.score || a.entry.path.localeCompare(b.entry.path))
    .slice(0, 40);
}
