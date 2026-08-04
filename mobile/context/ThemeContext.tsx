import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_THEME_ID,
  getThemeById,
  THEME_CATALOG,
  ThemePack,
} from '@/constants/themeCatalog';

const STORAGE_KEY = 'mydiary_theme_id';

type ThemeContextValue = {
  ready: boolean;
  themeId: string;
  tokens: ThemePack;
  catalog: ThemePack[];
  setThemeId: (id: string) => Promise<void>;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [themeId, setThemeIdState] = useState(DEFAULT_THEME_ID);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) setThemeIdState(stored);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const setThemeId = useCallback(async (id: string) => {
    const next = getThemeById(id);
    setThemeIdState(next.id);
    await AsyncStorage.setItem(STORAGE_KEY, next.id);
  }, []);

  const tokens = useMemo(() => getThemeById(themeId), [themeId]);
  const isDark = tokens.category !== 'light';

  const value = useMemo(
    () => ({
      ready,
      themeId: tokens.id,
      tokens,
      catalog: THEME_CATALOG,
      setThemeId,
      isDark,
    }),
    [ready, tokens, setThemeId, isDark]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

export function useThemeOptional() {
  return useContext(ThemeContext);
}
