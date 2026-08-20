import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'mydiary_day_gems_v1';

/** Local per-date gem map (backs API until deploy; also offline). */
export async function loadDayGems(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return {};
    const out: Record<string, string> = {};
    for (const [date, gemId] of Object.entries(parsed)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      const id = String(gemId || '').trim();
      if (id) out[date] = id;
    }
    return out;
  } catch {
    return {};
  }
}

export async function getDayGem(date: string): Promise<string> {
  const all = await loadDayGems();
  return all[date] || '';
}

export async function setDayGem(date: string, gemId: string | null): Promise<void> {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
  try {
    const all = await loadDayGems();
    const id = (gemId || '').trim();
    if (id) all[date] = id;
    else delete all[date];
    await AsyncStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // best-effort
  }
}
