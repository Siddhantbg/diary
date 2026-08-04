export function toDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatLongDate(key: string): string {
  return parseDateKey(key).toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatShortDate(key: string): string {
  return parseDateKey(key).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Reference style: “Monday , Aug 03 , 2026” */
export function formatCalendarStrip(key: string): string {
  const d = parseDateKey(key);
  const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  return `${weekday} , ${month} ${day} , ${year}`;
}

/** e.g. AUGUST 2026 */
export function formatMonthYear(year: number, monthIndex: number): string {
  const d = new Date(year, monthIndex, 1);
  const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  return label.toUpperCase();
}

export function monthRange(year: number, monthIndex: number) {
  const from = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
  const last = new Date(year, monthIndex + 1, 0).getDate();
  const to = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
  return { from, to };
}

export function formatLogTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export const MOOD_LABELS = [
  '',
  'Meh',
  'Happy',
  'Glad',
  'Loved',
  'Playful',
  'Amazed',
  'Angry',
  'Down',
  'Sad',
  'Sobbing',
] as const;

/** 10 reference moods (entry editor popover). Index = mood id 1–10. */
export const MOOD_EMOJIS = [
  '',
  '😐',
  '🙂',
  '😆',
  '🥰',
  '😉',
  '🤩',
  '😡',
  '😔',
  '😢',
  '😭',
] as const;

/** Circle fill tints for mood badges (reference palette). */
export const MOOD_COLORS = [
  '',
  '#F0A040',
  '#F0C040',
  '#F5D040',
  '#F080A0',
  '#A060C8',
  '#F0C030',
  '#E05040',
  '#70A0D0',
  '#A090D0',
  '#40B0A0',
] as const;

export const MOOD_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

/** Large day number + short month/year for entry header */
export function getEntryDateParts(key: string) {
  const d = parseDateKey(key);
  return {
    dayNum: String(d.getDate()).padStart(2, '0'),
    monthYear: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    weekday: d.toLocaleDateString('en-US', { weekday: 'long' }),
  };
}

export function shiftDateKey(key: string, deltaDays: number): string {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + deltaDays);
  return toDateKey(d);
}
