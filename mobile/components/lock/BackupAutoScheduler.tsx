import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useSettings } from '@/context/SettingsContext';
import { maybeAutoBackup } from '@/lib/backupRestore';

/**
 * When Auto Backup is on, sync to Drive after app returns to foreground
 * if the last backup is older than 24h.
 */
export function BackupAutoScheduler() {
  const { api, ready, unlocked } = useSettings();
  const running = useRef(false);

  useEffect(() => {
    if (!ready || !unlocked) return;

    const tick = async () => {
      if (running.current) return;
      running.current = true;
      try {
        await maybeAutoBackup(api);
      } finally {
        running.current = false;
      }
    };

    // Mild delay so cold start + PIN unlock settle first
    const t = setTimeout(() => void tick(), 8000);

    const onChange = (state: AppStateStatus) => {
      if (state === 'active') void tick();
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => {
      clearTimeout(t);
      sub.remove();
    };
  }, [ready, unlocked, api]);

  return null;
}
