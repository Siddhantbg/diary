import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'mydiary_entry_draft_v1:';

export type EntryDraft = {
  /** Unsaved compose buffer (becomes a timed moment on SAVE) */
  draft: string;
  title: string;
  tagsText: string;
  peopleText: string;
  mood: number | null;
  favorite: boolean;
  legendId: string;
  gemId: string;
  weatherNote: string;
  /** ISO string if user set a custom next-log time */
  customLogTimeIso: string | null;
  updatedAt: number;
};

function key(date: string) {
  return `${PREFIX}${date}`;
}

export function isDraftEmpty(d: EntryDraft | null | undefined): boolean {
  if (!d) return true;
  return (
    !d.draft.trim() &&
    !d.title.trim() &&
    !d.tagsText.trim() &&
    !d.peopleText.trim() &&
    d.mood == null &&
    !d.favorite &&
    !d.legendId &&
    !d.gemId &&
    !d.weatherNote.trim() &&
    !d.customLogTimeIso
  );
}

/** True if draft has any local work worth restoring (compose or meta edits). */
export function draftHasWork(d: EntryDraft | null | undefined): boolean {
  if (!d) return false;
  return (
    !!d.draft.trim() ||
    !!d.title.trim() ||
    !!d.tagsText.trim() ||
    !!d.peopleText.trim() ||
    d.mood != null ||
    d.favorite ||
    !!d.legendId ||
    !!d.gemId ||
    !!d.weatherNote.trim() ||
    !!d.customLogTimeIso
  );
}

export async function loadEntryDraft(date: string): Promise<EntryDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(key(date));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as EntryDraft;
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      draft: String(parsed.draft ?? ''),
      title: String(parsed.title ?? ''),
      tagsText: String(parsed.tagsText ?? ''),
      peopleText: String(parsed.peopleText ?? ''),
      mood:
        parsed.mood === null || parsed.mood === undefined
          ? null
          : Number(parsed.mood),
      favorite: !!parsed.favorite,
      legendId: String(parsed.legendId ?? ''),
      gemId: String(parsed.gemId ?? ''),
      weatherNote: String(parsed.weatherNote ?? ''),
      customLogTimeIso: parsed.customLogTimeIso
        ? String(parsed.customLogTimeIso)
        : null,
      updatedAt: Number(parsed.updatedAt) || Date.now(),
    };
  } catch {
    return null;
  }
}

export async function saveEntryDraft(date: string, draft: EntryDraft): Promise<void> {
  try {
    if (!date) return;
    if (isDraftEmpty(draft)) {
      await AsyncStorage.removeItem(key(date));
      return;
    }
    await AsyncStorage.setItem(
      key(date),
      JSON.stringify({ ...draft, updatedAt: Date.now() })
    );
  } catch {
    // Best-effort only — never block writing UI
  }
}

export async function clearEntryDraft(date: string): Promise<void> {
  try {
    if (!date) return;
    await AsyncStorage.removeItem(key(date));
  } catch {
    // ignore
  }
}

/** All on-device drafts that still have work (for home list Draft badges). */
export async function listAllDrafts(): Promise<Record<string, EntryDraft>> {
  const out: Record<string, EntryDraft> = {};
  try {
    const keys = await AsyncStorage.getAllKeys();
    const draftKeys = keys.filter((k) => k.startsWith(PREFIX));
    if (!draftKeys.length) return out;
    const pairs = await AsyncStorage.multiGet(draftKeys);
    for (const [k, raw] of pairs) {
      if (!raw) continue;
      const date = k.slice(PREFIX.length);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      try {
        const parsed = JSON.parse(raw) as EntryDraft;
        if (draftHasWork(parsed)) {
          out[date] = {
            draft: String(parsed.draft ?? ''),
            title: String(parsed.title ?? ''),
            tagsText: String(parsed.tagsText ?? ''),
            peopleText: String(parsed.peopleText ?? ''),
            mood:
              parsed.mood === null || parsed.mood === undefined
                ? null
                : Number(parsed.mood),
            favorite: !!parsed.favorite,
            legendId: String(parsed.legendId ?? ''),
            gemId: String(parsed.gemId ?? ''),
            weatherNote: String(parsed.weatherNote ?? ''),
            customLogTimeIso: parsed.customLogTimeIso
              ? String(parsed.customLogTimeIso)
              : null,
            updatedAt: Number(parsed.updatedAt) || Date.now(),
          };
        }
      } catch {
        // skip bad keys
      }
    }
  } catch {
    // ignore
  }
  return out;
}
