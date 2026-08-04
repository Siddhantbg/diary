import { DiaryApi, DiaryEntry } from '@/lib/api';

export type TagSummary = {
  name: string;
  count: number;
  /** Entry dates that use this tag */
  dates: string[];
};

/** Normalize user input into a clean tag token (no leading #). */
export function normalizeTag(raw: string): string {
  return raw
    .trim()
    .replace(/^#+/, '')
    .replace(/\s+/g, ' ')
    .slice(0, 40);
}

export function parseTagsText(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of text.split(/[,;\n]+/)) {
    const t = normalizeTag(part);
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

export function tagsToText(tags: string[]): string {
  return tags.join(', ');
}

export function displayTag(name: string): string {
  const n = normalizeTag(name);
  return n ? `# ${n}` : '#';
}

/** Aggregate tags across diaries (paged fetch). */
export async function collectTagSummaries(api: DiaryApi): Promise<TagSummary[]> {
  const entries = await fetchAllEntriesLocal(api);
  const map = new Map<string, TagSummary>();

  for (const e of entries) {
    for (const raw of e.tags || []) {
      const name = normalizeTag(raw);
      if (!name) continue;
      const key = name.toLowerCase();
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
        existing.dates.push(e.date);
      } else {
        map.set(key, { name, count: 1, dates: [e.date] });
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.name.localeCompare(b.name);
  });
}

async function fetchAllEntriesLocal(api: DiaryApi): Promise<DiaryEntry[]> {
  const out: DiaryEntry[] = [];
  const pageSize = 100;
  let skip = 0;
  for (;;) {
    const batch = await api.listEntries(pageSize, skip);
    out.push(...batch);
    if (batch.length < pageSize) break;
    skip += pageSize;
    if (skip > 10000) break;
  }
  return out;
}

/** Rename a tag on every entry that uses it. */
export async function renameTagEverywhere(
  api: DiaryApi,
  from: string,
  to: string
): Promise<number> {
  const fromN = normalizeTag(from);
  const toN = normalizeTag(to);
  if (!fromN || !toN || fromN.toLowerCase() === toN.toLowerCase()) return 0;

  const entries = await fetchAllEntriesLocal(api);
  let updated = 0;
  for (const e of entries) {
    const tags = e.tags || [];
    if (!tags.some((t) => normalizeTag(t).toLowerCase() === fromN.toLowerCase())) continue;
    const next = tags
      .map((t) =>
        normalizeTag(t).toLowerCase() === fromN.toLowerCase() ? toN : normalizeTag(t)
      )
      .filter(Boolean);
    // de-dupe
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const t of next) {
      const k = t.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      unique.push(t);
    }
    await api.saveEntry(e.date, { tags: unique });
    updated += 1;
  }
  return updated;
}

/** Remove a tag from every entry that uses it. */
export async function deleteTagEverywhere(api: DiaryApi, tag: string): Promise<number> {
  const name = normalizeTag(tag);
  if (!name) return 0;
  const entries = await fetchAllEntriesLocal(api);
  let updated = 0;
  for (const e of entries) {
    const tags = e.tags || [];
    const next = tags.filter((t) => normalizeTag(t).toLowerCase() !== name.toLowerCase());
    if (next.length === tags.length) continue;
    await api.saveEntry(e.date, { tags: next });
    updated += 1;
  }
  return updated;
}
