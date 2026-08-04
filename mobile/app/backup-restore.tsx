import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Stack } from 'expo-router';
import { useSettings } from '@/context/SettingsContext';
import { useTheme } from '@/context/ThemeContext';
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
import {
  clearGoogleAuth,
  fetchGoogleUser,
  getAccessToken,
  isGoogleConfigured,
  loadSavedAccount,
  saveGoogleAuth,
  type GoogleAccount,
  useGoogleDriveAuthRequest,
} from '@/lib/googleDrive';

/**
 * Backup and Restore — Google Drive (drive.file).
 * No PRO crown. Full text + media backup into app folder on Drive.
 */
export default function BackupRestoreScreen() {
  const { api } = useSettings();
  const { tokens } = useTheme();
  const [request, response, promptAsync] = useGoogleDriveAuthRequest();

  const [account, setAccount] = useState<GoogleAccount | null>(null);
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
    const [acc, last, ab, days, token] = await Promise.all([
      loadSavedAccount(),
      getLastBackupAt(),
      getAutoBackup(),
      getBackupReminderDays(),
      getAccessToken(),
    ]);
    setAccount(token ? acc : null);
    setLastBackup(last);
    setAuto(ab);
    setReminderDays(days);
  }, []);

  useEffect(() => {
    void refreshMeta();
  }, [refreshMeta]);

  // response effect kept as secondary path when auth resolves via hook alone
  useEffect(() => {
    if (response?.type !== 'success' || !response.authentication?.accessToken) return;
    void (async () => {
      try {
        if (await getAccessToken()) {
          const profile =
            (await loadSavedAccount()) ||
            (await fetchGoogleUser(response.authentication!.accessToken!));
          await saveGoogleAuth(response.authentication!, profile);
          setAccount(profile);
        }
      } catch {
        // primary login path handles errors
      }
    })();
  }, [response]);

  const notice = (title: string, message: string) =>
    setSheet({
      title,
      message,
      actions: [{ key: 'ok', label: 'Got it', icon: '✓', onPress: () => undefined }],
    });

  const help = () =>
    notice(
      'Backup & Restore',
      'Backups are stored in your Google Drive under “MyDiary Backups”. We use the drive.file scope so the app only sees files it creates. Diary text, moods, tags, moments, photos, and voice notes are included. Diary PIN stays on this device and is never uploaded.'
    );

  const login = async (): Promise<boolean> => {
    if (!isGoogleConfigured()) {
      notice(
        'Google not configured',
        'Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to mobile/.env from Google Cloud Console (OAuth Web client), then restart Expo. Enable Google Drive API on the project and add your redirect URI.'
      );
      return false;
    }
    if (!request) {
      notice('Please wait', 'Google sign-in is still preparing…');
      return false;
    }
    const result = await promptAsync();
    if (result.type !== 'success' || !result.authentication?.accessToken) {
      if (result.type === 'error') {
        notice('Google login failed', result.error?.message || 'Sign-in was cancelled or failed.');
      }
      return false;
    }
    try {
      const profile = await fetchGoogleUser(result.authentication.accessToken);
      await saveGoogleAuth(result.authentication, profile);
      setAccount(profile);
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
      notice('Sign in first', 'Connect Google Drive before enabling Auto Backup.');
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
        ? `Signed in as ${account.email}. You can sign out and connect a different Google account.`
        : 'No Google account connected yet.',
      actions: [
        ...(account
          ? [
              {
                key: 'signout',
                label: 'Sign out',
                icon: '⎋',
                destructive: true,
                onPress: () => {
                  void clearGoogleAuth().then(() => {
                    setAccount(null);
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
                  void clearGoogleAuth().then(() => {
                    setAccount(null);
                    void login();
                  });
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
        {/* Google account header */}
        <Pressable
          onPress={() => void (account ? moreAccount() : login())}
          style={[styles.accountRow, { borderBottomColor: tokens.line }]}
        >
          <View style={[styles.gBadge, { backgroundColor: tokens.bgElevated, borderColor: tokens.line }]}>
            <Text style={[styles.gLetter, { color: '#4285F4' }]}>G</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: tokens.text }]}>Backup to Google Drive</Text>
            <Text style={[styles.rowSub, { color: tokens.textMuted }]}>
              {account ? account.email : 'Tap to login'}
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

        <Pressable
          onPress={moreAccount}
          style={[styles.row, { borderBottomColor: tokens.line }]}
        >
          <Text style={[styles.rowTitle, { color: tokens.text, flex: 1 }]}>More Backup Account</Text>
          <Text style={{ color: tokens.textSubtle, fontSize: 18 }}>›</Text>
        </Pressable>

        <Pressable
          onPress={pickReminder}
          style={[styles.row, { borderBottomColor: tokens.line }]}
        >
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
                {progress.total > 1
                  ? ` (${progress.current}/${progress.total})`
                  : ''}
              </Text>
            ) : (
              <Text style={[styles.progressText, { color: tokens.textMuted }]}>Working…</Text>
            )}
          </View>
        ) : null}

        <Text style={[styles.footer, { color: tokens.textSubtle }]}>
          Backups use Google’s drive.file permission — only the MyDiary Backups folder created by
          this app. Configure EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID for sign-in.
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
