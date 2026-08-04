import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSIONS_KEY = 'diary_lock_prompt_sessions_v1';
const LAST_SHOWN_KEY = 'diary_lock_prompt_last_shown_session_v1';
const SNOOZE_UNTIL_KEY = 'diary_lock_prompt_snooze_until_v1';

/** Minimum sessions before the first offer. */
const FIRST_SHOW_AT_SESSION = 2;

/** After the user taps LATER (or dismisses), wait this many more sessions. */
const SESSIONS_BETWEEN_SHOWS = 5;

/** Soft snooze when user taps LATER (also enforces time space). */
const SNOOZE_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

let sessionCountedThisLaunch = false;

/**
 * Count one diary-use session per app launch (after unlock).
 * Safe to call repeatedly — only increments once per JS runtime.
 */
export async function recordLockPromptSession(): Promise<number> {
  if (sessionCountedThisLaunch) {
    const raw = await AsyncStorage.getItem(SESSIONS_KEY);
    return Number(raw || '0') || 0;
  }
  sessionCountedThisLaunch = true;
  const prev = Number((await AsyncStorage.getItem(SESSIONS_KEY)) || '0') || 0;
  const next = prev + 1;
  await AsyncStorage.setItem(SESSIONS_KEY, String(next));
  return next;
}

export async function shouldShowLockPrompt(): Promise<boolean> {
  const now = Date.now();
  const snoozeUntil = Number((await AsyncStorage.getItem(SNOOZE_UNTIL_KEY)) || '0') || 0;
  if (snoozeUntil > now) return false;

  const session = Number((await AsyncStorage.getItem(SESSIONS_KEY)) || '0') || 0;
  const lastShown = Number((await AsyncStorage.getItem(LAST_SHOWN_KEY)) || '0') || 0;

  if (session < FIRST_SHOW_AT_SESSION) return false;
  if (lastShown === 0) return true;
  return session - lastShown >= SESSIONS_BETWEEN_SHOWS;
}

/** Mark offered this session so the cadence continues. */
export async function markLockPromptShown(): Promise<void> {
  const session = Number((await AsyncStorage.getItem(SESSIONS_KEY)) || '0') || 0;
  await AsyncStorage.setItem(LAST_SHOWN_KEY, String(session));
}

/** User chose LATER — time + session gap before next offer. */
export async function snoozeLockPrompt(): Promise<void> {
  await markLockPromptShown();
  await AsyncStorage.setItem(SNOOZE_UNTIL_KEY, String(Date.now() + SNOOZE_MS));
}
