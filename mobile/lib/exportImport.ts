import { DiaryEntry, DiaryApi } from '@/lib/api';
import { shiftDateKey, toDateKey, MOOD_LABELS } from '@/lib/dates';

export type ExportPeriodId = 'last7' | 'last30' | 'last90' | 'all' | 'custom';

export const EXPORT_PERIOD_OPTIONS: { id: ExportPeriodId; label: string }[] = [
  { id: 'last7', label: 'Last 7 days' },
  { id: 'last30', label: 'Last 30 days' },
  { id: 'last90', label: 'Last 90 days' },
  { id: 'all', label: 'All entries' },
  { id: 'custom', label: 'Custom range' },
];

export function periodLabel(id: ExportPeriodId): string {
  return EXPORT_PERIOD_OPTIONS.find((o) => o.id === id)?.label ?? 'Last 7 days';
}

/** Display YYYY/MM/DD like reference UI */
export function formatExportDateSlash(key: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return key;
  return key.replace(/-/g, '/');
}

export function rangeForPeriod(
  id: ExportPeriodId,
  customFrom?: string,
  customTo?: string
): { from: string | null; to: string | null } {
  const today = toDateKey();
  if (id === 'all') return { from: null, to: null };
  if (id === 'custom') {
    return {
      from: customFrom && customFrom <= (customTo || customFrom) ? customFrom : customFrom || today,
      to: customTo && customTo >= (customFrom || customTo) ? customTo : customTo || today,
    };
  }
  const days = id === 'last7' ? 6 : id === 'last30' ? 29 : 89;
  return { from: shiftDateKey(today, -days), to: today };
}

/** Pull all diary pages from API (max 100 per request). */
export async function fetchAllEntries(api: DiaryApi): Promise<DiaryEntry[]> {
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

export function filterEntriesByRange(
  entries: DiaryEntry[],
  from: string | null,
  to: string | null
): DiaryEntry[] {
  return entries
    .filter((e) => {
      if (from && e.date < from) return false;
      if (to && e.date > to) return false;
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function entriesToTxt(entries: DiaryEntry[], watermark: boolean): string {
  const lines: string[] = [];
  lines.push('MyDiary export');
  lines.push(`Generated: ${new Date().toLocaleString()}`);
  lines.push(`Entries: ${entries.length}`);
  lines.push('='.repeat(40));
  lines.push('');

  for (const e of entries) {
    lines.push(e.date);
    if (e.title) lines.push(e.title);
    if (e.mood) lines.push(`Mood: ${MOOD_LABELS[e.mood] || e.mood}`);
    if (e.tags?.length) lines.push(`Tags: ${e.tags.join(', ')}`);
    if (e.people?.length) lines.push(`People: ${e.people.join(', ')}`);
    if (e.favorite) lines.push('★ Cherished');
    const logs = e.logs || [];
    if (logs.length) {
      lines.push('Moments:');
      for (const log of logs) {
        const t = log.at ? new Date(log.at).toLocaleString() : '';
        lines.push(`  [${t}] ${log.text}`);
      }
    } else if (e.body) {
      lines.push(e.body);
    }
    if (e.photoIds?.length) lines.push(`Photos: ${e.photoIds.length}`);
    if (e.voiceIds?.length) lines.push(`Voice notes: ${e.voiceIds.length}`);
    lines.push('-'.repeat(32));
    lines.push('');
  }

  if (watermark) {
    lines.push('');
    lines.push('— Exported from MyDiary —');
  }
  return lines.join('\n');
}

export function entriesToHtml(
  entries: DiaryEntry[],
  options: { includeMediaNote: boolean; watermark: boolean }
): string {
  const body = entries
    .map((e) => {
      const logs = (e.logs || [])
        .map((l) => {
          const t = l.at ? new Date(l.at).toLocaleString() : '';
          return `<p style="margin:4px 0;color:#555"><small>${esc(t)}</small><br/>${esc(l.text)}</p>`;
        })
        .join('');
      const media =
        options.includeMediaNote && (e.photoIds?.length || e.voiceIds?.length)
          ? `<p style="color:#888;font-size:12px">${e.photoIds?.length || 0} photo(s) · ${
              e.voiceIds?.length || 0
            } voice note(s)</p>`
          : '';
      return `
        <section style="margin-bottom:28px;page-break-inside:avoid">
          <h2 style="margin:0 0 4px;font-size:18px">${esc(e.date)}${
            e.title ? ` · ${esc(e.title)}` : ''
          }</h2>
          ${e.mood ? `<p style="margin:0 0 8px;color:#666">Mood: ${esc(MOOD_LABELS[e.mood] || '')}</p>` : ''}
          ${logs || (e.body ? `<p>${esc(e.body)}</p>` : '<p style="color:#aaa">No text</p>')}
          ${media}
        </section>`;
    })
    .join('\n');

  const footer = options.watermark
    ? `<footer style="margin-top:40px;text-align:center;color:#999;font-size:11px">MyDiary export</footer>`
    : '';

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>MyDiary export</title>
<style>
  body { font-family: Georgia, serif; padding: 24px; color: #111; line-height: 1.45; }
  h1 { font-size: 22px; }
</style></head>
<body>
  <h1>MyDiary</h1>
  <p style="color:#666">${entries.length} entr${entries.length === 1 ? 'y' : 'ies'} · ${esc(
    new Date().toLocaleString()
  )}</p>
  ${body}
  ${footer}
</body></html>`;
}

function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export type DataPackage = {
  format: 'mydiary-package';
  version: 1;
  exportedAt: string;
  entries: DiaryEntry[];
};

export function buildDataPackage(entries: DiaryEntry[]): DataPackage {
  return {
    format: 'mydiary-package',
    version: 1,
    exportedAt: new Date().toISOString(),
    entries,
  };
}

export function parseDataPackage(raw: string): DataPackage {
  const data = JSON.parse(raw) as DataPackage & { entries?: DiaryEntry[] };
  if (!data || !Array.isArray(data.entries)) {
    throw new Error('Invalid package: missing entries list');
  }
  return {
    format: 'mydiary-package',
    version: 1,
    exportedAt: data.exportedAt || new Date().toISOString(),
    entries: data.entries,
  };
}
