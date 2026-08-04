import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createApi, DiaryApi } from '@/lib/api';
import {
  AppConfig,
  clearPin,
  clearRecoveryEmail,
  clearSecurityQuestion,
  loadConfig,
  savePin,
  saveRecoveryEmail,
  saveSecurityQuestion,
  setFingerprintEnabled,
  verifyPin,
  verifySecurityAnswer,
} from '@/lib/config';

type SettingsContextValue = {
  ready: boolean;
  config: AppConfig;
  api: DiaryApi;
  unlocked: boolean;
  refreshConfig: () => Promise<void>;
  /** Enable lock with PIN (local + server) */
  enablePin: (pin: string) => Promise<void>;
  /** Change PIN when lock already on */
  changePin: (currentPin: string, nextPin: string) => Promise<void>;
  disablePin: (currentPin?: string) => Promise<void>;
  unlockWithPin: (pin: string) => Promise<boolean>;
  unlock: () => void;
  lock: () => void;
  setFingerprint: (on: boolean) => Promise<void>;
  setSecurityQuestion: (
    question: string,
    answer: string,
    currentPin?: string
  ) => Promise<void>;
  setRecoveryEmail: (email: string, currentPin?: string) => Promise<void>;
  recoverWithAnswer: (answer: string, newPin: string) => Promise<boolean>;
  verifyLocalSecurityAnswer: (answer: string) => Promise<boolean>;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [config, setConfig] = useState<AppConfig>({
    apiUrl: '',
    apiSecret: '',
    pinEnabled: false,
    hasPin: false,
    fingerprintEnabled: false,
    hasSecurityQuestion: false,
    securityQuestion: '',
    hasEmail: false,
    recoveryEmail: '',
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

  const api = useMemo(
    () => createApi(config.apiUrl || 'https://diary-api-2xnl.onrender.com', config.apiSecret),
    [config.apiUrl, config.apiSecret]
  );

  /** Soft sync from server when online (prefer local PIN as source of truth for unlocking). */
  const syncFromServer = useCallback(async () => {
    try {
      const remote = await api.getLock();
      // If server has lock and device doesn't, don't steal PIN — only fill recovery metadata
      if (remote.hasSecurityQuestion && remote.securityQuestion) {
        // question is public; don't overwrite blank local without hashes
      }
      // Keep local pinEnabled as device gate; after enable both match
    } catch {
      // offline ok
    }
  }, [api]);

  useEffect(() => {
    if (ready) void syncFromServer();
  }, [ready, syncFromServer]);

  const value: SettingsContextValue = {
    ready,
    config,
    api,
    unlocked,
    refreshConfig,
    enablePin: async (pin) => {
      await savePin(pin);
      setUnlocked(true);
      try {
        await api.enableLock({
          pin,
          fingerprintEnabled: (await loadConfig()).fingerprintEnabled,
        });
      } catch {
        // Local lock still works offline
      }
      await refreshConfig();
    },
    changePin: async (currentPin, nextPin) => {
      const ok = await verifyPin(currentPin);
      if (!ok) throw new Error('Current PIN is incorrect');
      await savePin(nextPin);
      try {
        await api.updateLock({ currentPin, pin: nextPin });
      } catch {
        // keep local
      }
      await refreshConfig();
    },
    disablePin: async (currentPin) => {
      if (currentPin) {
        const ok = await verifyPin(currentPin);
        if (!ok) throw new Error('Current PIN is incorrect');
      }
      await clearPin();
      await clearSecurityQuestion();
      setUnlocked(true);
      try {
        await api.updateLock({
          currentPin: currentPin || undefined,
          lockEnabled: false,
        });
      } catch {
        // offline: local already cleared
      }
      await refreshConfig();
    },
    unlockWithPin: async (pin) => {
      let ok = await verifyPin(pin);
      if (!ok) {
        try {
          const remote = await api.verifyLockPin(pin);
          if (remote.ok) {
            // Server accepted — rehydrate device PIN for offline use
            await savePin(pin);
            ok = true;
          }
        } catch {
          // ignore
        }
      }
      if (ok) setUnlocked(true);
      return ok;
    },
    unlock: () => setUnlocked(true),
    lock: () => {
      if (config.pinEnabled) setUnlocked(false);
    },
    setFingerprint: async (on) => {
      await setFingerprintEnabled(on);
      try {
        if (config.pinEnabled) {
          await api.updateLock({ fingerprintEnabled: on });
        }
      } catch {
        // local only
      }
      await refreshConfig();
    },
    setSecurityQuestion: async (question, answer, currentPin) => {
      if (currentPin) {
        const ok = await verifyPin(currentPin);
        if (!ok) throw new Error('Current PIN is incorrect');
      }
      await saveSecurityQuestion(question, answer);
      try {
        await api.updateLock({
          currentPin,
          securityQuestion: question,
          securityAnswer: answer,
        });
      } catch {
        // local only
      }
      await refreshConfig();
    },
    setRecoveryEmail: async (email, currentPin) => {
      if (currentPin) {
        const ok = await verifyPin(currentPin);
        if (!ok) throw new Error('Current PIN is incorrect');
      }
      await saveRecoveryEmail(email);
      try {
        await api.updateLock({
          currentPin,
          recoveryEmail: email,
        });
      } catch {
        // local
      }
      await refreshConfig();
    },
    recoverWithAnswer: async (answer, newPin) => {
      // Local first
      const localOk = await verifySecurityAnswer(answer);
      if (localOk) {
        await savePin(newPin);
        try {
          await api.recoverLock(answer, newPin);
        } catch {
          // still unlocked locally
        }
        setUnlocked(true);
        await refreshConfig();
        return true;
      }
      // Server recovery
      try {
        await api.recoverLock(answer, newPin);
        await savePin(newPin);
        setUnlocked(true);
        await refreshConfig();
        return true;
      } catch {
        return false;
      }
    },
    verifyLocalSecurityAnswer: verifySecurityAnswer,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
