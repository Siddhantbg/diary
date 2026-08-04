import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { DiaryApi, DiaryEntry } from '@/lib/api';
import { AppPreferences, DEFAULT_PREFERENCES } from '@/context/PreferencesContext';
import { fetchAllEntries } from '@/lib/exportImport';
import {
  downloadDriveFileBase64,
  downloadDriveFileText,
  findFileInFolder,
  findOrCreateBackupFolder,
  getAccessToken,
  listBackupManifest,
  MANIFEST_NAME,
  upsertDriveFileUri,
  upsertDriveJson,
} from '@/lib/googleDrive';
import { API_SECRET, API_URL } from '@/lib/env';

const PREFS_KEY = 'mydiary_prefs_v1';
const THEME_KEY = 'mydiary_theme_id';
const LAST_BACKUP_KEY = 'mydiary_last_backup_at';
const AUTO_BACKUP_KEY = 'mydiary_auto_backup';
const REMINDER_DAYS_KEY = 'mydiary_backup_reminder_days';
const LAST_REMINDER_KEY = 'mydiary_last_backup_reminder_at';

const MEDIA_CONCURRENCY = 3;

export type BackupMediaRef = {
  id: string;
  kind: 'photo' | 'voice';
  entryDate: string;
  contentType: string;
  /** Drive file name under media/ */
  fileName: string;
};

export type DriveBackupManifest = {
  format: 'mydiary-drive-backup';
  version: 2;
  exportedAt: string;
  entryCount: number;
  mediaCount: number;
  /** Compact entries (no binary). */
  entries: DiaryEntry[];
  prefs: Partial<AppPreferences>;
  themeId: string | null;
  media: BackupMediaRef[];
};

export type BackupProgress = {
  phase: string;
  current: number;
  total: number;
};

async function mapPool<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
  onStep?: (done: number, total: number) => void
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  let done = 0;
  async function run() {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i], i);
      done += 1;
      onStep?.(done, items.length);
    }
  }
  const n = Math.min(limit, Math.max(1, items.length));
  await Promise.all(Array.from({ length: n }, () => run()));
  return results;
}

function collectMediaJobs(entries: DiaryEntry[]): BackupMediaRef[] {
  const out: BackupMediaRef[] = [];
  for (const e of entries) {
    for (const id of e.photoIds || []) {
      out.push({
        id,
        kind: 'photo',
        entryDate: e.date,
        contentType: 'image/jpeg',
        fileName: `media/photo-${id}.bin`,
      });
    }
    for (const id of e.voiceIds || []) {
      out.push({
        id,
        kind: 'voice',
        entryDate: e.date,
        contentType: 'audio/mp4',
        fileName: `media/voice-${id}.bin`,
      });
    }
  }
  return out;
}

async function fetchMediaToCache(
  url: string,
  accessSecret: string,
  id: string
): Promise<string> {
  const dest = `${FileSystem.cacheDirectory}backup-media-${id}.bin`;
  const result = await FileSystem.downloadAsync(url, dest, {
    headers: { 'x-api-secret': accessSecret },
  });
  if (result.status !== 200) {
    throw new Error(`Media download failed (${result.status})`);
  }
  return dest;
}

/**
 * Full diary backup to Google Drive.
 * - entries + prefs + theme in one JSON manifest (efficient for text)
 * - photos/voices as separate files under MyDiary Backups (avoid one huge base64 JSON)
 * Uses drive.file scope only (app-created files).
 */
export async function backupAllToDrive(
  api: DiaryApi,
  onProgress?: (p: BackupProgress) => void
): Promise<{ exportedAt: string; entryCount: number; mediaCount: number }> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not signed in to Google. Tap Backup to Google Drive to login.');

  onProgress?.({ phase: 'Loading diary…', current: 0, total: 1 });
  const entries = await fetchAllEntries(api);
  const mediaRefs = collectMediaJobs(entries);

  let prefs: Partial<AppPreferences> = DEFAULT_PREFERENCES;
  let themeId: string | null = null;
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    if (raw) prefs = { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
  } catch {
    // defaults
  }
  try {
    themeId = await AsyncStorage.getItem(THEME_KEY);
  } catch {
    // ignore
  }

  const exportedAt = new Date().toISOString();
  const manifest: DriveBackupManifest = {
    format: 'mydiary-drive-backup',
    version: 2,
    exportedAt,
    entryCount: entries.length,
    mediaCount: mediaRefs.length,
    entries: entries.map((e) => ({
      ...e,
      // Ensure arrays
      logs: e.logs || [],
      tags: e.tags || [],
      people: e.people || [],
      photoIds: e.photoIds || [],
      voiceIds: e.voiceIds || [],
    })),
    prefs,
    themeId,
    media: mediaRefs,
  };

  onProgress?.({ phase: 'Creating Drive folder…', current: 0, total: 1 });
  const folderId = await findOrCreateBackupFolder(token);

  onProgress?.({ phase: 'Uploading diary text…', current: 0, total: 1 });
  await upsertDriveJson(token, folderId, MANIFEST_NAME, JSON.stringify(manifest));

  // Optional dated snapshot for history (text only — lighter)
  const stamp = exportedAt.slice(0, 10).replace(/-/g, '');
  await upsertDriveJson(
    token,
    folderId,
    `mydiary-snapshot-${stamp}.json`,
    JSON.stringify({
      ...manifest,
      media: mediaRefs.map((m) => ({ ...m /* no binary */ })),
    })
  );

  const baseUrl = API_URL.replace(/\/$/, '');
  onProgress?.({ phase: 'Uploading photos & voice…', current: 0, total: mediaRefs.length });

  await mapPool(
    mediaRefs,
    MEDIA_CONCURRENCY,
    async (ref) => {
      try {
        const path = `/photos/${ref.id}`;
        const url = `${baseUrl}${path}`;
        const localUri = await fetchMediaToCache(url, API_SECRET, ref.id);
        const shortName = ref.fileName.replace('media/', '');
        await upsertDriveFileUri(token, folderId, shortName, localUri, ref.contentType);
        try {
          await FileSystem.deleteAsync(localUri, { idempotent: true });
        } catch {
          // ignore
        }
      } catch {
        // Skip missing media so text backup still completes
      }
      return ref;
    },
    (current, total) =>
      onProgress?.({ phase: 'Uploading photos & voice…', current, total })
  );

  await AsyncStorage.setItem(LAST_BACKUP_KEY, exportedAt);
  return {
    exportedAt,
    entryCount: entries.length,
    mediaCount: mediaRefs.length,
  };
}

/**
 * Restore from latest Drive manifest + media files → diary API.
 */
export async function restoreAllFromDrive(
  api: DiaryApi,
  onProgress?: (p: BackupProgress) => void
): Promise<{ restored: number; mediaRestored: number; failed: number }> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not signed in to Google. Tap Backup to Google Drive to login.');

  onProgress?.({ phase: 'Finding backup…', current: 0, total: 1 });
  const { fileId, folderId } = await listBackupManifest(token);
  if (!fileId) throw new Error('No MyDiary backup found on Google Drive yet.');

  onProgress?.({ phase: 'Downloading diary…', current: 0, total: 1 });
  const raw = await downloadDriveFileText(token, fileId);
  const manifest = JSON.parse(raw) as DriveBackupManifest;
  if (!manifest?.entries || !Array.isArray(manifest.entries)) {
    throw new Error('Backup file is invalid or empty.');
  }

  // Restore prefs / theme locally (no PIN secrets)
  if (manifest.prefs) {
    try {
      const next = { ...DEFAULT_PREFERENCES, ...manifest.prefs };
      await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }
  if (manifest.themeId) {
    try {
      await AsyncStorage.setItem(THEME_KEY, manifest.themeId);
    } catch {
      // ignore
    }
  }

  let restored = 0;
  let failed = 0;
  const total = manifest.entries.length;
  onProgress?.({ phase: 'Restoring entries…', current: 0, total });

  for (let i = 0; i < manifest.entries.length; i++) {
    const e = manifest.entries[i];
    if (!e?.date || !/^\d{4}-\d{2}-\d{2}$/.test(e.date)) {
      failed += 1;
      continue;
    }
    try {
      await api.saveEntry(e.date, {
        title: e.title || '',
        mood: e.mood ?? null,
        tags: e.tags || [],
        people: e.people || [],
        favorite: !!e.favorite,
        weatherNote: e.weatherNote || '',
        body: e.body || '',
        logs: e.logs || [],
      } as Parameters<typeof api.saveEntry>[1]);
      restored += 1;
    } catch {
      failed += 1;
    }
    onProgress?.({ phase: 'Restoring entries…', current: i + 1, total });
  }

  // Media restore: map old ids → re-upload files into entry dates
  let mediaRestored = 0;
  const media = manifest.media || [];
  onProgress?.({ phase: 'Restoring media…', current: 0, total: media.length });

  await mapPool(
    media,
    MEDIA_CONCURRENCY,
    async (ref) => {
      try {
        // Find file by short name
        const shortName = ref.fileName.replace('media/', '');
        const mid = await findFileInFolder(token, folderId, shortName);
        if (!mid) return;
        const b64 = await downloadDriveFileBase64(token, mid);
        const dest = `${FileSystem.cacheDirectory}restore-${ref.id}`;
        await FileSystem.writeAsStringAsync(dest, b64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        if (ref.kind === 'photo') {
          await api.uploadPhoto(ref.entryDate, dest);
        } else {
          await api.uploadVoice(ref.entryDate, dest, 0);
        }
        mediaRestored += 1;
        try {
          await FileSystem.deleteAsync(dest, { idempotent: true });
        } catch {
          // ignore
        }
      } catch {
        // skip corrupt/missing
      }
    },
    (current, totalM) => onProgress?.({ phase: 'Restoring media…', current, total: totalM })
  );

  return { restored, mediaRestored, failed };
}

export async function getLastBackupAt(): Promise<string | null> {
  return AsyncStorage.getItem(LAST_BACKUP_KEY);
}

export async function setAutoBackup(on: boolean) {
  await AsyncStorage.setItem(AUTO_BACKUP_KEY, on ? '1' : '0');
}

export async function getAutoBackup(): Promise<boolean> {
  return (await AsyncStorage.getItem(AUTO_BACKUP_KEY)) === '1';
}

export type ReminderDays = 1 | 3 | 7 | 14;

export async function setBackupReminderDays(days: ReminderDays) {
  await AsyncStorage.setItem(REMINDER_DAYS_KEY, String(days));
}

export async function getBackupReminderDays(): Promise<ReminderDays> {
  const v = Number((await AsyncStorage.getItem(REMINDER_DAYS_KEY)) || '3');
  if (v === 1 || v === 3 || v === 7 || v === 14) return v;
  return 3;
}

export function formatBackupAgo(iso: string | null): string {
  if (!iso) return "Haven't synced";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "Haven't synced";
  const mins = Math.floor((Date.now() - t) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? '' : 's'} ago · ${new Date(iso).toLocaleDateString()}`;
}

/** Auto-backup if enabled and last backup older than 24h. */
export async function maybeAutoBackup(api: DiaryApi): Promise<boolean> {
  if (!(await getAutoBackup())) return false;
  const token = await getAccessToken();
  if (!token) return false;
  const last = await getLastBackupAt();
  if (last) {
    const age = Date.now() - new Date(last).getTime();
    if (age < 24 * 60 * 60 * 1000) return false;
  }
  try {
    await backupAllToDrive(api);
    return true;
  } catch {
    return false;
  }
}

export async function shouldShowBackupReminder(): Promise<boolean> {
  if (await getAutoBackup()) return false;
  const days = await getBackupReminderDays();
  const last = (await getLastBackupAt()) || (await AsyncStorage.getItem(LAST_REMINDER_KEY));
  const token = await getAccessToken();
  if (!token) return false;
  if (!last) {
    // first time with account: after 1 day of install-ish skip
    return true;
  }
  const age = Date.now() - new Date(last).getTime();
  return age >= days * 24 * 60 * 60 * 1000;
}

export async function markBackupReminderShown() {
  await AsyncStorage.setItem(LAST_REMINDER_KEY, new Date().toISOString());
}
