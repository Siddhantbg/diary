import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { useSettings } from '@/context/SettingsContext';
import { useTheme } from '@/context/ThemeContext';
import { useGoogleAccount } from '@/context/GoogleAccountContext';
import { fonts, spacing } from '@/constants/theme';
import { ActionSheet, SheetAction } from '@/components/ui/ActionSheet';
import { friendlyApiMessage } from '@/lib/api';
import {
  backupAllToDrive,
  formatBackupAgo,
  getAutoBackup,
  getBackupReminderDays,
  getLastBackupAt,
  ReminderDays,
  restoreAllFromDrive,
  setAutoBackup,
  setBackupReminderDays,
  type BackupProgress,
} from '@/lib/backupRestore';
import { getAccessToken } from '@/lib/googleDrive';

/**
 * Backup and Restore — Google Drive (drive.file).
 * Uses the same Google account as Mine → Sign in with Google.
 */
export default function BackupRestoreScreen() {
  const { api } = useSettings();
  const { tokens } = useTheme();
  const {
    account,
    configured,
    signingIn,
    signInWithGoogle,
    signOutGoogle,
    refreshAccount,
  } = useGoogleAccount();

  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [auto, setAuto] = useState(false);
  const [reminderDays, setReminderDays] = useState<ReminderDays>(3);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<BackupProgress | null>(null);
  const [sheet, setSheet] = useState<{
    title: string;
    message?: string;
    actions: SheetAction[];
  } | null>(null);

  const refreshMeta = useCallback(async () => {
    const [last, ab, days] = await Promise.all([
      getLastBackupAt(),
      getAutoBackup(),
      getBackupReminderDays(),
    ]);
    setLastBackup(last);
    setAuto(ab);
    setReminderDays(days);
    await refreshAccount();
  }, [refreshAccount]);

  useFocusEffect(
    useCallback(() => {
      void refreshMeta();
    }, [refreshMeta])
  );

  const notice = (title: string, message: string) =>
    setSheet({
      title,
      message,
      actions: [{ key: 'ok', label: 'Got it', icon: '✓', onPress: () => undefined }],
    });

  const help = () =>
    notice(
      'Backup & Restore',
      'Sign in with Google on Mine (or here). Backups go to Drive under “MyDiary Backups”. The app only sees files it creates (drive.file). Diary PIN stays on this device.'
    );

  const login = async (): Promise<boolean> => {
    if (!configured) {
      notice(
        'Google not configured',
        'Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to mobile/.env (OAuth Web client), then restart Expo. Enable Google Drive API and add redirect URI https://diary-api-2xnl.onrender.com/oauth/google/callback.'
      );
      return false;
    }
    try {
      await signInWithGoogle();
      return true;
    } catch (e: unknown) {
      notice('Google login failed', e instanceof Error ? e.message : friendlyApiMessage(e));
      return false;
    }
  };

  const run = async (label: string, work: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setProgress(null);
    try {
      await work();
      await refreshMeta();
    } catch (e: unknown) {
      notice(`${label} failed`, e instanceof Error ? e.message : friendlyApiMessage(e));
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  const onBackup = () =>
    run('Backup', async () => {
      if (!(await getAccessToken())) {
        const ok = await login();
        if (!ok) return;
      }
      const result = await backupAllToDrive(api, setProgress);
      notice(
        'Backup complete',
        `Saved ${result.entryCount} day${result.entryCount === 1 ? '' : 's'} and ${
          result.mediaCount
        } media file${result.mediaCount === 1 ? '' : 's'} to Google Drive.`
      );
    });

  const onRestore = () => {
    setSheet({
      title: 'Restore from Drive?',
      message:
        'This writes backup data into your diary on the server. Existing days are overwritten by matching dates. Photos may be re-attached as new files.',
      actions: [
        {
          key: 'restore',
          label: 'Restore now',
          icon: '☁',
          onPress: () => {
            void run('Restore', async () => {
              if (!(await getAccessToken())) {
                const ok = await login();
                if (!ok) return;
              }
              const r = await restoreAllFromDrive(api, setProgress);
              notice(
                'Restore finished',
                `Restored ${r.restored} day${r.restored === 1 ? '' : 's'}, ${
                  r.mediaRestored
                } media file${r.mediaRestored === 1 ? '' : 's'}${
                  r.failed ? ` · ${r.failed} skipped` : ''
                }.`
              );
            });
          },
        },
        {
          key: 'cancel',
          label: 'Cancel',
          icon: '✕',
          cancel: true,
          onPress: () => undefined,
        },
      ],
    });
  };

  const onToggleAuto = async (on: boolean) => {
    if (on && !(await getAccessToken())) {
      notice('Sign in first', 'Connect Google on Mine (or tap above) before enabling Auto Backup.');
      return;
    }
    await setAutoBackup(on);
    setAuto(on);
  };

  const pickReminder = () => {
    const options: ReminderDays[] = [1, 3, 7, 14];
    setSheet({
      title: 'Backup Reminder',
      message: 'How often should we remind you if you have not backed up?',
      actions: [
        ...options.map((d) => ({
          key: String(d),
          label: d === 1 ? 'Every day' : `Every ${d} days${d === reminderDays ? ' · current' : ''}`,
          icon: d === reminderDays ? '✓' : '·',
          onPress: () => {
            void setBackupReminderDays(d).then(() => setReminderDays(d));
          },
        })),
        {
          key: 'cancel',
          label: 'Cancel',
          icon: '✕',
          cancel: true,
          onPress: () => undefined,
        },
      ],
    });
  };

  const moreAccount = () => {
    setSheet({
      title: 'Backup account',
      message: account
        ? `Signed in as ${account.email}. Same account as Mine → Sign in with Google.`
        : 'No Google account connected yet. Sign in on Mine or here.',
      actions: [
        ...(account
          ? [
              {
                key: 'signout',
                label: 'Sign out',
                icon: '⎋',
                destructive: true,
                onPress: () => {
                  void signOutGoogle().then(() => {
                    void setAutoBackup(false);
                    setAuto(false);
                  });
                },
              },
              {
                key: 'switch',
                label: 'Switch account',
                icon: '⇄',
                onPress: () => {
                  void signOutGoogle().then(() => void login());
                },
              },
            ]
          : [
              {
                key: 'login',
                label: 'Connect Google',
                icon: 'G',
                onPress: () => void login(),
              },
            ]),
        {
          key: 'cancel',
          label: 'Cancel',
          icon: '✕',
          cancel: true,
          onPress: () => undefined,
        },
      ],
    });
  };

  const lastLabel = formatBackupAgo(lastBackup);

  return (
    <View style={[styles.screen, { backgroundColor: tokens.bg }]}>
      <Stack.Screen
        options={{
          title: 'Backup and Restore',
          headerBackTitle: 'Back',
          headerRight: () => (
            <Pressable onPress={help} hitSlop={12} accessibilityLabel="Help">
              <View style={[styles.helpBubble, { backgroundColor: tokens.accent }]}>
                <Text style={styles.helpGlyph}>?</Text>
              </View>
            </Pressable>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          onPress={() => void (account ? moreAccount() : login())}
          disabled={signingIn}
          style={[styles.accountRow, { borderBottomColor: tokens.line }]}
        >
          <View style={[styles.gBadge, { backgroundColor: tokens.bgElevated, borderColor: tokens.line }]}>
            <Text style={[styles.gLetter, { color: '#4285F4' }]}>G</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: tokens.text }]}>Backup to Google Drive</Text>
            <Text style={[styles.rowSub, { color: tokens.textMuted }]}>
              {signingIn
                ? 'Signing in…'
                : account
                  ? account.email
                  : 'Tap to login (same as Mine)'}
            </Text>
          </View>
        </Pressable>

        <Pressable
          onPress={() => void onBackup()}
          disabled={busy}
          style={[styles.row, { borderBottomColor: tokens.line }]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: tokens.text }]}>Backup Data</Text>
            <Text style={[styles.rowSub, { color: tokens.textMuted }]}>{lastLabel}</Text>
          </View>
        </Pressable>

        <View style={[styles.row, { borderBottomColor: tokens.line }]}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={[styles.rowTitle, { color: tokens.text }]}>Auto Backup</Text>
            <Text style={[styles.rowSub, { color: tokens.textMuted }]}>
              Enable Auto Backup to prevent forgetting diary synchronization.
            </Text>
          </View>
          <Switch
            value={auto}
            onValueChange={(v) => void onToggleAuto(v)}
            disabled={busy}
            trackColor={{ false: tokens.line, true: tokens.accent }}
            thumbColor="#FFFFFF"
          />
        </View>

        <Pressable
          onPress={onRestore}
          disabled={busy}
          style={[styles.row, { borderBottomColor: tokens.line }]}
        >
          <Text style={[styles.rowTitle, { color: tokens.text }]}>Restore Data</Text>
        </Pressable>

        <Pressable onPress={moreAccount} style={[styles.row, { borderBottomColor: tokens.line }]}>
          <Text style={[styles.rowTitle, { color: tokens.text, flex: 1 }]}>More Backup Account</Text>
          <Text style={{ color: tokens.textSubtle, fontSize: 18 }}>›</Text>
        </Pressable>

        <Pressable onPress={pickReminder} style={[styles.row, { borderBottomColor: tokens.line }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: tokens.text }]}>Backup Reminder</Text>
            <Text style={[styles.rowSub, { color: tokens.textMuted }]}>
              {reminderDays === 1 ? '1 day' : `${reminderDays} days`}
            </Text>
          </View>
        </Pressable>

        {busy ? (
          <View style={styles.progressBox}>
            <ActivityIndicator color={tokens.accent} />
            {progress ? (
              <Text style={[styles.progressText, { color: tokens.textMuted }]}>
                {progress.phase}
                {progress.total > 1 ? ` (${progress.current}/${progress.total})` : ''}
              </Text>
            ) : (
              <Text style={[styles.progressText, { color: tokens.textMuted }]}>Working…</Text>
            )}
          </View>
        ) : null}

        <Text style={[styles.footer, { color: tokens.textSubtle }]}>
          Sign in once on Mine; Backup uses that same Gmail. Needs EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
          in mobile/.env.
        </Text>
      </ScrollView>

      <ActionSheet
        visible={!!sheet}
        title={sheet?.title ?? ''}
        message={sheet?.message}
        actions={sheet?.actions ?? []}
        onClose={() => setSheet(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 48,
  },
  helpBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  helpGlyph: {
    color: '#FFFFFF',
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  gBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gLetter: {
    fontFamily: fonts.display,
    fontSize: 22,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowTitle: {
    fontFamily: fonts.body,
    fontSize: 16,
    marginBottom: 2,
  },
  rowSub: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  progressBox: {
    marginTop: spacing.xl,
    alignItems: 'center',
    gap: 10,
  },
  progressText: {
    fontFamily: fonts.body,
    fontSize: 13,
    textAlign: 'center',
  },
  footer: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 17,
    marginTop: spacing.xl,
    textAlign: 'center',
  },
});
