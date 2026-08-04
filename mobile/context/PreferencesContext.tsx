import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'mydiary_prefs_v1';

export type FirstDayOfWeek = 'sunday' | 'monday' | 'auto';
export type DateFormatPref = 'medium' | 'long' | 'iso';
export type TimeFormatPref = 'system' | '12h' | '24h';

export type AppPreferences = {
  /** Home “On this day” section */
  showOnThisDay: boolean;
  /** Show mood chip/dot on calendar markers */
  displayMoodOnCalendar: boolean;
  /** Hint under day write box when no mood set */
  showDefaultMoodHint: boolean;
  /** Stub preference — reserved for templates */
  keepBackgroundTemplate: boolean;
  firstDayOfWeek: FirstDayOfWeek;
  dateFormat: DateFormatPref;
  timeFormat: TimeFormatPref;
  /** Strip MyDiary footer from PDF exports when true */
  removeExportWatermark: boolean;
};

export const DEFAULT_PREFERENCES: AppPreferences = {
  showOnThisDay: true,
  displayMoodOnCalendar: true,
  showDefaultMoodHint: true,
  keepBackgroundTemplate: true,
  firstDayOfWeek: 'auto',
  dateFormat: 'medium',
  timeFormat: 'system',
  removeExportWatermark: false,
};

type PreferencesContextValue = {
  ready: boolean;
  prefs: AppPreferences;
  setPref: <K extends keyof AppPreferences>(key: K, value: AppPreferences[K]) => Promise<void>;
  setPrefs: (partial: Partial<AppPreferences>) => Promise<void>;
  /** Calendar `firstDay`: 0 Sun, 1 Mon */
  calendarFirstDay: number;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [prefs, setPrefsState] = useState<AppPreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<AppPreferences>;
          setPrefsState({ ...DEFAULT_PREFERENCES, ...parsed });
        }
      } catch {
        // keep defaults
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const persist = useCallback(async (next: AppPreferences) => {
    setPrefsState(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const setPref = useCallback(
    async <K extends keyof AppPreferences>(key: K, value: AppPreferences[K]) => {
      const next = { ...prefs, [key]: value };
      await persist(next);
    },
    [prefs, persist]
  );

  const setPrefs = useCallback(
    async (partial: Partial<AppPreferences>) => {
      await persist({ ...prefs, ...partial });
    },
    [prefs, persist]
  );

  const calendarFirstDay = useMemo(() => {
    if (prefs.firstDayOfWeek === 'monday') return 1;
    if (prefs.firstDayOfWeek === 'sunday') return 0;
    // auto from device locale region
    const sundayFirstRegions = ['US', 'CA', 'JP', 'PH', 'IL', 'MX', 'BR'];
    try {
      const locale = Intl.DateTimeFormat().resolvedOptions().locale;
      const region = locale.split('-')[1]?.toUpperCase();
      if (region && sundayFirstRegions.includes(region)) return 0;
    } catch {
      // ignore
    }
    return 1;
  }, [prefs.firstDayOfWeek]);

  const value = useMemo(
    () => ({
      ready,
      prefs,
      setPref,
      setPrefs,
      calendarFirstDay,
    }),
    [ready, prefs, setPref, setPrefs, calendarFirstDay]
  );

  return (
    <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider');
  return ctx;
}

export function usePreferencesOptional() {
  return useContext(PreferencesContext);
}

/** Format helpers driven by prefs */
export function formatPrefDate(key: string, format: DateFormatPref): string {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (format === 'iso') return key;
  if (format === 'long') {
    return date.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
  return date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatPrefTime(iso: string, format: TimeFormatPref): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const hour12 = format === '12h' ? true : format === '24h' ? false : undefined;
  return d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12,
  });
}

export const FIRST_DAY_LABELS: Record<FirstDayOfWeek, string> = {
  auto: 'Auto',
  sunday: 'Sunday',
  monday: 'Monday',
};

export const DATE_FORMAT_LABELS: Record<DateFormatPref, string> = {
  medium: '03 Aug 2026',
  long: 'Monday, August 3, 2026',
  iso: '2026-08-03',
};

export const TIME_FORMAT_LABELS: Record<TimeFormatPref, string> = {
  system: 'System default',
  '12h': '12-hour',
  '24h': '24-hour',
};
