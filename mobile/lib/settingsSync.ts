/**
 * Cloud mirror for device settings (prefs, theme, legends, drafts, day gems, backup prefs).
 * Local AsyncStorage stays the fast source of truth; Mongo is the APK/phone backup.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DiaryApi } from '@/lib/api';
import { DEFAULT_THEME_ID } from '@/constants/themeCatalog';

const PREFS_KEY = 'mydiary_prefs_v1';
const THEME_KEY = 'mydiary_theme_id';
const LEGENDS_KEY = 'mydiary_legends_v1';
const DAY_GEMS_KEY = 'mydiary_day_gems_v1';
const AUTO_BACKUP_KEY = 'mydiary_auto_backup';
const REMINDER_DAYS_KEY = 'mydiary_backup_reminder_days';
const LAST_BACKUP_KEY = 'mydiary_last_backup_at';
const DRAFT_PREFIX = 'mydiary_entry_draft_v1:';

const LOCAL_MUTATED_AT = 'mydiary_settings_local_mutated_at';
const CLOUD_AT = 'mydiary_settings_cloud_at';

const DEFAULT_PREFERENCES = {
  showOnThisDay: true,
  displayMoodOnCalendar: true,
  showDefaultMoodHint: true,
  keepBackgroundTemplate: true,
  firstDayOfWeek: 'auto',
  dateFormat: 'medium',
  timeFormat: 'system',
  removeExportWatermark: false,
};

export type CloudSettingsBundle = {
  preferences: Record<string, unknown>;
  themeId: string;
  legends: unknown[];
  dayGems: Record<string, string>;
  drafts: Record<string, unknown>;
  backup: {
    autoBackup: boolean;
    reminderDays: number;
    lastBackupAt: string;
  };
};

type HydrateListener = () => void;
const listeners = new Set<HydrateListener>();

export function onSettingsHydrated(fn: HydrateListener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function notifyHydrated() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      // ignore
    }
  });
}

let getApi: (() => DiaryApi | null) | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let hydratePromise: Promise<void> | null = null;
let pushing = false;

export function bindSettingsApi(getter: () => DiaryApi | null) {
  getApi = getter;
}

async function markLocalMutated() {
  await AsyncStorage.setItem(LOCAL_MUTATED_AT, String(Date.now()));
}

async function setCloudAt(isoOrMs: string | number | null | undefined) {
  if (!isoOrMs) return;
  const ms = typeof isoOrMs === 'number' ? isoOrMs : new Date(isoOrMs).getTime();
  if (!Number.isFinite(ms)) return;
  await AsyncStorage.setItem(CLOUD_AT, String(ms));
}

async function loadDraftsFromStorage(): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = {};
  try {
    const keys = await AsyncStorage.getAllKeys();
    const draftKeys = keys.filter((k) => k.startsWith(DRAFT_PREFIX));
    if (!draftKeys.length) return out;
    const pairs = await AsyncStorage.multiGet(draftKeys);
    for (const [k, raw] of pairs) {
      if (!raw) continue;
      const date = k.slice(DRAFT_PREFIX.length);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      try {
        out[date] = JSON.parse(raw);
      } catch {
        // skip
      }
    }
  } catch {
    // ignore
  }
  return out;
}

export async function collectLocalSettings(): Promise<CloudSettingsBundle> {
  const [
    prefsRaw,
    themeId,
    legendsRaw,
    dayGemsRaw,
    autoBackup,
    reminderDays,
    lastBackupAt,
  ] = await Promise.all([
    AsyncStorage.getItem(PREFS_KEY),
    AsyncStorage.getItem(THEME_KEY),
    AsyncStorage.getItem(LEGENDS_KEY),
    AsyncStorage.getItem(DAY_GEMS_KEY),
    AsyncStorage.getItem(AUTO_BACKUP_KEY),
    AsyncStorage.getItem(REMINDER_DAYS_KEY),
    AsyncStorage.getItem(LAST_BACKUP_KEY),
  ]);

  let preferences: Record<string, unknown> = { ...DEFAULT_PREFERENCES };
  if (prefsRaw) {
    try {
      preferences = { ...DEFAULT_PREFERENCES, ...JSON.parse(prefsRaw) };
    } catch {
      // keep defaults
    }
  }

  let legends: unknown[] = [];
  if (legendsRaw) {
    try {
      const parsed = JSON.parse(legendsRaw);
      if (Array.isArray(parsed)) legends = parsed;
    } catch {
      legends = [];
    }
  }

  let dayGems: Record<string, string> = {};
  if (dayGemsRaw) {
    try {
      const parsed = JSON.parse(dayGemsRaw) as Record<string, unknown>;
      if (parsed && typeof parsed === 'object') {
        for (const [date, gemId] of Object.entries(parsed)) {
          if (/^\d{4}-\d{2}-\d{2}$/.test(date) && gemId) dayGems[date] = String(gemId);
        }
      }
    } catch {
      dayGems = {};
    }
  }

  const drafts = await loadDraftsFromStorage();
  const reminder = Number(reminderDays || '3');

  return {
    preferences,
    themeId: themeId || DEFAULT_THEME_ID,
    legends,
    dayGems,
    drafts,
    backup: {
      autoBackup: autoBackup === '1',
      reminderDays: [1, 3, 7, 14].includes(reminder) ? reminder : 3,
      lastBackupAt: lastBackupAt || '',
    },
  };
}

async function applyRemoteToLocal(remote: {
  preferences?: Record<string, unknown>;
  themeId?: string;
  legends?: unknown[];
  dayGems?: Record<string, string>;
  drafts?: Record<string, unknown>;
  backup?: { autoBackup?: boolean; reminderDays?: number; lastBackupAt?: string };
}): Promise<void> {
  if (remote.preferences && typeof remote.preferences === 'object') {
    const next = { ...DEFAULT_PREFERENCES, ...remote.preferences };
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next));
  }
  if (remote.themeId) {
    await AsyncStorage.setItem(THEME_KEY, String(remote.themeId));
  }
  if (Array.isArray(remote.legends) && remote.legends.length) {
    await AsyncStorage.setItem(LEGENDS_KEY, JSON.stringify(remote.legends));
  }
  if (remote.dayGems && typeof remote.dayGems === 'object') {
    await AsyncStorage.setItem(DAY_GEMS_KEY, JSON.stringify(remote.dayGems));
  }
  if (remote.backup) {
    await AsyncStorage.setItem(AUTO_BACKUP_KEY, remote.backup.autoBackup ? '1' : '0');
    const days = Number(remote.backup.reminderDays || 3);
    await AsyncStorage.setItem(
      REMINDER_DAYS_KEY,
      String([1, 3, 7, 14].includes(days) ? days : 3)
    );
    if (remote.backup.lastBackupAt) {
      await AsyncStorage.setItem(LAST_BACKUP_KEY, String(remote.backup.lastBackupAt));
    }
  }

  if (remote.drafts && typeof remote.drafts === 'object') {
    const keys = await AsyncStorage.getAllKeys();
    const oldDrafts = keys.filter((k) => k.startsWith(DRAFT_PREFIX));
    if (oldDrafts.length) await AsyncStorage.multiRemove(oldDrafts);
    const pairs: [string, string][] = [];
    for (const [date, draft] of Object.entries(remote.drafts)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !draft) continue;
      pairs.push([`${DRAFT_PREFIX}${date}`, JSON.stringify(draft)]);
    }
    if (pairs.length) await AsyncStorage.multiSet(pairs);
  }
}

async function pushNow(api: DiaryApi): Promise<void> {
  if (pushing) return;
  pushing = true;
  try {
    const local = await collectLocalSettings();
    const saved = await api.putSettings(local);
    await setCloudAt(saved.updatedAt);
  } finally {
    pushing = false;
  }
}

/** Call after any local settings mutation — debounced full upload. */
export function scheduleSettingsPush(): void {
  void markLocalMutated();
  const api = getApi?.() ?? null;
  if (!api) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void pushNow(api).catch(() => {
      // offline / cold start — next hydrate or edit retries
    });
  }, 700);
}

/**
 * Startup / resume: merge cloud ↔ local, then notify UI to reload from AsyncStorage.
 */
export async function hydrateSettingsFromCloud(api: DiaryApi): Promise<void> {
  if (hydratePromise) return hydratePromise;
  hydratePromise = (async () => {
    try {
      const remote = await api.getSettings();
      const localMutated = Number((await AsyncStorage.getItem(LOCAL_MUTATED_AT)) || '0') || 0;
      const cloudAt = Number((await AsyncStorage.getItem(CLOUD_AT)) || '0') || 0;
      const remoteAt = remote.updatedAt ? new Date(remote.updatedAt).getTime() : 0;

      if (!remote.hasContent) {
        await pushNow(api);
        notifyHydrated();
        return;
      }

      if (!cloudAt && !localMutated) {
        await applyRemoteToLocal(remote);
        await setCloudAt(remote.updatedAt);
        notifyHydrated();
        return;
      }

      if (localMutated && localMutated > remoteAt) {
        await pushNow(api);
        notifyHydrated();
        return;
      }

      if (remoteAt > cloudAt) {
        await applyRemoteToLocal(remote);
        await setCloudAt(remote.updatedAt);
        if (localMutated && localMutated <= remoteAt) {
          await AsyncStorage.setItem(LOCAL_MUTATED_AT, '0');
        }
        notifyHydrated();
        return;
      }

      notifyHydrated();
    } catch {
      // offline ok
    } finally {
      hydratePromise = null;
    }
  })();
  return hydratePromise;
}
