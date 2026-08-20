import AsyncStorage from '@react-native-async-storage/async-storage';
import { DiaryEntry, DayMarker, Stats } from '@/lib/api';

const ENTRIES_KEY = 'mydiary_cache_entries_v1';
const MARKERS_PREFIX = 'mydiary_cache_markers_v1:';
const STATS_KEY = 'mydiary_cache_stats_v1';
const MOOD_SAMPLES_KEY = 'mydiary_cache_mood_samples_v1';

/** Instant home paint from last successful fetch. */
export async function readCachedEntries(): Promise<DiaryEntry[] | null> {
  try {
    const raw = await AsyncStorage.getItem(ENTRIES_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DiaryEntry[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function writeCachedEntries(entries: DiaryEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
  } catch {
    // ignore quota
  }
}

export async function readCachedMarkers(
  from: string,
  to: string
): Promise<Record<string, DayMarker> | null> {
  try {
    const raw = await AsyncStorage.getItem(`${MARKERS_PREFIX}${from}_${to}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, DayMarker>;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export async function writeCachedMarkers(
  from: string,
  to: string,
  markers: Record<string, DayMarker>
): Promise<void> {
  try {
    await AsyncStorage.setItem(`${MARKERS_PREFIX}${from}_${to}`, JSON.stringify(markers));
  } catch {
    // ignore
  }
}

export async function readCachedStats(): Promise<Stats | null> {
  try {
    const raw = await AsyncStorage.getItem(STATS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Stats;
  } catch {
    return null;
  }
}

export async function writeCachedStats(stats: Stats): Promise<void> {
  try {
    await AsyncStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    // ignore
  }
}

export type CachedMoodSample = { date: string; mood: number };

export async function readCachedMoodSamples(): Promise<CachedMoodSample[] | null> {
  try {
    const raw = await AsyncStorage.getItem(MOOD_SAMPLES_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedMoodSample[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function writeCachedMoodSamples(samples: CachedMoodSample[]): Promise<void> {
  try {
    await AsyncStorage.setItem(MOOD_SAMPLES_KEY, JSON.stringify(samples));
  } catch {
    // ignore
  }
}
