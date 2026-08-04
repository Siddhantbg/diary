import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import Constants from 'expo-constants';
import { Stack, useRouter } from 'expo-router';
import { useSettings } from '@/context/SettingsContext';
import { useTheme } from '@/context/ThemeContext';
import {
  DATE_FORMAT_LABELS,
  DateFormatPref,
  FIRST_DAY_LABELS,
  FirstDayOfWeek,
  TIME_FORMAT_LABELS,
  TimeFormatPref,
  usePreferences,
} from '@/context/PreferencesContext';
import { fonts, spacing } from '@/constants/theme';
import { ActionSheet, SheetAction } from '@/components/ui/ActionSheet';
import { LockIcon } from '@/components/icons/LockIcon';
import { BackupIcon } from '@/components/icons/BackupIcon';
import { ExportIcon } from '@/components/icons/ExportIcon';
import { ThemeIcon } from '@/components/icons/ThemeIcon';
import { LegendIcon } from '@/components/icons/LegendIcon';

type SheetState = {
  title: string;
  message?: string;
  actions: SheetAction[];
};

export default function SettingsScreen() {
  const { config, api } = useSettings();
  const { tokens, themeId, catalog, isDark } = useTheme();
  const { prefs, setPref } = usePreferences();
  const router = useRouter();
  const activeTheme = catalog.find((t) => t.id === themeId);

  const [connStatus, setConnStatus] = useState('');
  const [sheet, setSheet] = useState<SheetState | null>(null);

  const version =
    Constants.expoConfig?.version || Constants.nativeAppVersion || '1.0.0';

  const openSheet = (next: SheetState) => setSheet(next);
  const closeSheet = () => setSheet(null);

  const stub = (title: string) =>
    openSheet({
      title,
      message: 'Coming soon in a future update.',
      actions: [{ key: 'ok', label: 'Got it', icon: '✓', onPress: () => undefined }],
    });

  const pick = <T extends string>(
    title: string,
    options: { id: T; label: string }[],
    current: T,
    onPick: (id: T) => void
  ) => {
    openSheet({
      title,
      message: 'Choose a preference for this diary.',
      actions: [
        ...options.map((o) => ({
          key: o.id,
          label: o.id === current ? `${o.label}  · current` : o.label,
          icon: o.id === current ? '✓' : '·',
          onPress: () => onPick(o.id),
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

  const testConnection = async () => {
    try {
      const res = await fetch(`${config.apiUrl}/health`);
      const data = await res.json();
      await api.listEntries(1);
      setConnStatus(`Connected · mongo: ${data.mongo}`);
    } catch (e: unknown) {
      setConnStatus(e instanceof Error ? e.message : 'Connection failed');
    }
  };

  const Icon = ({ glyph }: { glyph: string }) => (
    <View style={[styles.iconBubble, { backgroundColor: tokens.accentSoft }]}>
      <Text style={{ fontSize: 16, color: tokens.accent }}>{glyph}</Text>
    </View>
  );

  const Chevron = () => (
    <Text style={{ color: tokens.textSubtle, fontSize: 18, marginLeft: 4 }}>›</Text>
  );

  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg }}>
      <Stack.Screen options={{ title: 'Settings', headerBackTitle: 'Back' }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* GENERAL */}
        <Section title="General" color={tokens.accent} />
        <Row
          tokens={tokens}
          icon={<Icon glyph="☺" />}
          title="Mood Style"
          onPress={() => stub('Mood Style')}
          right={<Chevron />}
        />
        <Row
          tokens={tokens}
          icon={<Icon glyph="✦" />}
          title="Sticker Mall"
          onPress={() => stub('Sticker Mall')}
          right={<Chevron />}
        />
        <Row
          tokens={tokens}
          icon={<Icon glyph="◎" />}
          title="Tags"
          onPress={() => router.push('/tags')}
          right={<Chevron />}
        />
        <Row
          tokens={tokens}
          icon={
            <View style={[styles.iconBubble, { backgroundColor: tokens.accentSoft }]}>
              <LockIcon color={tokens.accent} variant={isDark ? 'dark' : 'light'} size={18} />
            </View>
          }
          title="Diary Lock"
          subtitle={config.pinEnabled ? 'PIN enabled' : 'Off'}
          onPress={() => router.push('/lock')}
          right={<Chevron />}
        />
        <Row
          tokens={tokens}
          icon={
            <View style={[styles.iconBubble, { backgroundColor: tokens.accentSoft }]}>
              <BackupIcon
                color={tokens.accent}
                cutoutColor={tokens.accentSoft}
                variant={isDark ? 'dark' : 'light'}
                size={18}
              />
            </View>
          }
          title="Backup and Restore"
          onPress={() => router.push('/backup-restore')}
          right={<Chevron />}
        />
        <Row
          tokens={tokens}
          icon={
            <View style={[styles.iconBubble, { backgroundColor: tokens.accentSoft }]}>
              <ThemeIcon
                color={tokens.accent}
                cutoutColor={tokens.accentSoft}
                variant={isDark ? 'dark' : 'light'}
                size={18}
              />
            </View>
          }
          title="Theme"
          subtitle={activeTheme?.name ?? 'Gallery'}
          onPress={() => router.push('/themes')}
          right={<Chevron />}
        />
        <Row
          tokens={tokens}
          icon={<Icon glyph="▦" />}
          title="Widget"
          onPress={() => stub('Widget')}
          right={<Chevron />}
        />
        <Row
          tokens={tokens}
          icon={<Icon glyph="◉" />}
          title="Notification"
          onPress={() => stub('Notification')}
          right={<Chevron />}
        />
        <Row
          tokens={tokens}
          icon={
            <View style={[styles.iconBubble, { backgroundColor: tokens.accentSoft }]}>
              <ExportIcon
                color={tokens.accent}
                cutoutColor={tokens.accentSoft}
                variant={isDark ? 'dark' : 'light'}
                size={18}
              />
            </View>
          }
          title="Export & Import"
          onPress={() => router.push('/export-import')}
          right={<Chevron />}
        />
        <Row
          tokens={tokens}
          icon={
            <View style={[styles.iconBubble, { backgroundColor: tokens.accentSoft }]}>
              <LegendIcon
                color={tokens.accent}
                variant={isDark ? 'dark' : 'light'}
                chipColors={['#4A90E2', '#FFC857', '#5BC57A']}
                size={18}
              />
            </View>
          }
          title="Legends"
          subtitle="Calendar color keys"
          onPress={() => router.push('/legends')}
          right={<Chevron />}
        />

        {/* DIARY PREFERENCES */}
        <Section title="Diary Preferences" color={tokens.accent} />
        <ToggleRow
          tokens={tokens}
          title="Show On This Day"
          subtitle="Home memories from past years"
          value={prefs.showOnThisDay}
          onValueChange={(v) => setPref('showOnThisDay', v)}
        />
        <ToggleRow
          tokens={tokens}
          title="Display Mood on Calendar"
          subtitle="Show mood when a day has one set"
          value={prefs.displayMoodOnCalendar}
          onValueChange={(v) => setPref('displayMoodOnCalendar', v)}
        />
        <ToggleRow
          tokens={tokens}
          title="Default Mood Helper Text"
          subtitle="Hint to set mood when writing"
          value={prefs.showDefaultMoodHint}
          onValueChange={(v) => setPref('showDefaultMoodHint', v)}
        />
        <ToggleRow
          tokens={tokens}
          title="Keep Background / Template"
          subtitle="Reserved for themed templates"
          value={prefs.keepBackgroundTemplate}
          onValueChange={(v) => setPref('keepBackgroundTemplate', v)}
        />

        {/* TIME OPTIONS */}
        <Section title="Time Options" color={tokens.accent} />
        <Row
          tokens={tokens}
          icon={<Icon glyph="7" />}
          title="First Day of the Week"
          subtitle={FIRST_DAY_LABELS[prefs.firstDayOfWeek]}
          onPress={() =>
            pick<FirstDayOfWeek>(
              'First Day of the Week',
              (Object.keys(FIRST_DAY_LABELS) as FirstDayOfWeek[]).map((id) => ({
                id,
                label: FIRST_DAY_LABELS[id],
              })),
              prefs.firstDayOfWeek,
              (id) => setPref('firstDayOfWeek', id)
            )
          }
          right={<Chevron />}
        />
        <Row
          tokens={tokens}
          icon={<Icon glyph="📅" />}
          title="Diary Date Format"
          subtitle={DATE_FORMAT_LABELS[prefs.dateFormat]}
          onPress={() =>
            pick<DateFormatPref>(
              'Diary Date Format',
              (Object.keys(DATE_FORMAT_LABELS) as DateFormatPref[]).map((id) => ({
                id,
                label: DATE_FORMAT_LABELS[id],
              })),
              prefs.dateFormat,
              (id) => setPref('dateFormat', id)
            )
          }
          right={<Chevron />}
        />
        <Row
          tokens={tokens}
          icon={<Icon glyph="⏱" />}
          title="Time Format"
          subtitle={TIME_FORMAT_LABELS[prefs.timeFormat]}
          onPress={() =>
            pick<TimeFormatPref>(
              'Time Format',
              (Object.keys(TIME_FORMAT_LABELS) as TimeFormatPref[]).map((id) => ({
                id,
                label: TIME_FORMAT_LABELS[id],
              })),
              prefs.timeFormat,
              (id) => setPref('timeFormat', id)
            )
          }
          right={<Chevron />}
        />

        {/* ABOUT */}
        <Section title="About" color={tokens.accent} />
        <Row
          tokens={tokens}
          icon={<Icon glyph="🔒" />}
          title="Privacy Policy"
          onPress={() => stub('Privacy Policy')}
          right={<Chevron />}
        />
        <Row
          tokens={tokens}
          icon={<Icon glyph="★" />}
          title="Rate Us"
          onPress={() => stub('Rate Us')}
          right={<Chevron />}
        />
        <Row
          tokens={tokens}
          icon={<Icon glyph="?" />}
          title="Help Center"
          onPress={() => stub('Help Center')}
          right={<Chevron />}
        />
        <Row
          tokens={tokens}
          icon={<Icon glyph="♡" />}
          title="Donate"
          onPress={() => stub('Donate')}
          right={<Chevron />}
        />

        <Section title="Advanced" color={tokens.accent} />
        <Row
          tokens={tokens}
          icon={<Icon glyph="⚡" />}
          title="Test connection"
          subtitle={connStatus || 'API is wired in code — no keys to paste'}
          onPress={testConnection}
          right={<Chevron />}
        />
        <Text style={[styles.version, { color: tokens.textSubtle }]}>Version: {version}</Text>
      </ScrollView>

      <ActionSheet
        visible={!!sheet}
        title={sheet?.title ?? ''}
        message={sheet?.message}
        actions={sheet?.actions ?? []}
        onClose={closeSheet}
      />
    </View>
  );
}

function Section({ title, color }: { title: string; color: string }) {
  return (
    <Text style={[styles.section, { color }]}>{title}</Text>
  );
}

function Row({
  tokens,
  icon,
  title,
  subtitle,
  onPress,
  right,
}: {
  tokens: { text: string; textMuted: string; line: string };
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: tokens.line, opacity: pressed && onPress ? 0.7 : 1 },
      ]}
    >
      {icon}
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, { color: tokens.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.rowSub, { color: tokens.textMuted }]}>{subtitle}</Text>
        ) : null}
      </View>
      {right}
    </Pressable>
  );
}

function ToggleRow({
  tokens,
  title,
  subtitle,
  value,
  onValueChange,
}: {
  tokens: { text: string; textMuted: string; line: string; accent: string };
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={[styles.row, { borderBottomColor: tokens.line }]}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={[styles.rowTitle, { color: tokens.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.rowSub, { color: tokens.textMuted }]}>{subtitle}</Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: tokens.line, true: tokens.accent }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 48,
  },
  section: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    letterSpacing: 0.3,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  rowTitle: {
    fontFamily: fonts.body,
    fontSize: 16,
  },
  rowSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 2,
  },
  iconBubble: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  version: {
    fontFamily: fonts.body,
    fontSize: 12,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
