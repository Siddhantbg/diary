import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createApi, DiaryApi } from '@/lib/api';
import {
  AppConfig,
  clearPin,
  loadConfig,
  saveApiSecret,
  saveApiUrl,
  savePin,
  verifyPin,
} from '@/lib/config';

type SettingsContextValue = {
  ready: boolean;
  config: AppConfig;
  api: DiaryApi | null;
  unlocked: boolean;
  refreshConfig: () => Promise<void>;
  updateApiUrl: (url: string) => Promise<void>;
  updateApiSecret: (secret: string) => Promise<void>;
  enablePin: (pin: string) => Promise<void>;
  disablePin: () => Promise<void>;
  unlockWithPin: (pin: string) => Promise<boolean>;
  unlock: () => void;
  lock: () => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [config, setConfig] = useState<AppConfig>({
    apiUrl: '',
    apiSecret: '',
    pinEnabled: false,
    hasPin: false,
  });
  const [unlocked, setUnlocked] = useState(false);

  const refreshConfig = useCallback(async () => {
    const next = await loadConfig();
    setConfig(next);
    if (!next.pinEnabled || !next.hasPin) {
      setUnlocked(true);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    refreshConfig();
  }, [refreshConfig]);

  const api = useMemo(() => {
    if (!config.apiUrl || !config.apiSecret) return null;
    return createApi(config.apiUrl, config.apiSecret);
  }, [config.apiUrl, config.apiSecret]);

  const value: SettingsContextValue = {
    ready,
    config,
    api,
    unlocked,
    refreshConfig,
    updateApiUrl: async (url) => {
      await saveApiUrl(url);
      await refreshConfig();
    },
    updateApiSecret: async (secret) => {
      await saveApiSecret(secret);
      await refreshConfig();
    },
    enablePin: async (pin) => {
      await savePin(pin);
      setUnlocked(true);
      await refreshConfig();
    },
    disablePin: async () => {
      await clearPin();
      setUnlocked(true);
      await refreshConfig();
    },
    unlockWithPin: async (pin) => {
      const ok = await verifyPin(pin);
      if (ok) setUnlocked(true);
      return ok;
    },
    unlock: () => setUnlocked(true),
    lock: () => {
      if (config.pinEnabled) setUnlocked(false);
    },
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
