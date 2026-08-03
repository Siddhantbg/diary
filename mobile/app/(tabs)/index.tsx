import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import { useSettings } from '@/context/SettingsContext';
import { DiaryEntry, Stats } from '@/lib/api';
import { EntryCard } from '@/components/EntryCard';
import { toDateKey } from '@/lib/dates';
import { colors, fonts, spacing } from '@/constants/theme';

export default function HomeScreen() {
  const { api } = useSettings();
  const [recent, setRecent] = useState<DiaryEntry[]>([]);
  const [onThisDay, setOnThisDay] = useState<DiaryEntry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const today = toDateKey();

  const load = useCallback(async () => {
    setError('');
    try {
      const now = new Date();
      const [entries, otd, st] = await Promise.all([
        api.listEntries(12),
        api.onThisDay(now.getMonth() + 1, now.getDate()),
        api.stats(),
      ]);
      setRecent(entries);
      setOnThisDay(otd.filter((e) => e.date !== today));
      setStats(st);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [api, today]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.leaf} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          tintColor={colors.leaf}
        />
      }
    >
      <Text style={styles.brand}>Diary</Text>
      <Text style={styles.lede}>A quiet place for the days you want to keep.</Text>

      <Link href={`/day/${today}`} asChild>
        <Pressable style={styles.todayBtn}>
          <Text style={styles.todayLabel}>Write today</Text>
          <Text style={styles.todayDate}>{today}</Text>
        </Pressable>
      </Link>

      {!!error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {stats ? (
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{stats.streak}</Text>
            <Text style={styles.statLabel}>day streak</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{stats.totalEntries}</Text>
            <Text style={styles.statLabel}>entries</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{stats.daysWithPhotos}</Text>
            <Text style={styles.statLabel}>with photos</Text>
          </View>
        </View>
      ) : null}

      {onThisDay.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>On this day</Text>
          <Text style={styles.sectionSub}>Memories from years past</Text>
          {onThisDay.map((e) => (
            <EntryCard key={e.id} entry={e} />
          ))}
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>On this day</Text>
          <Text style={styles.muted}>Nothing from past years yet — keep writing.</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent</Text>
        {recent.length ? (
          recent.map((e) => <EntryCard key={e.id} entry={e} />)
        ) : (
          <Text style={styles.muted}>Your timeline is empty. Start with today.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: spacing.lg, paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper },
  brand: {
    fontFamily: fonts.display,
    fontSize: 40,
    color: colors.ink,
  },
  lede: {
    fontFamily: fonts.displayItalic,
    fontSize: 16,
    color: colors.inkMuted,
    marginTop: 4,
    marginBottom: spacing.lg,
  },
  todayBtn: {
    backgroundColor: colors.ink,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  todayLabel: {
    fontFamily: fonts.bodyMedium,
    color: colors.white,
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  todayDate: {
    fontFamily: fonts.display,
    color: colors.white,
    fontSize: 22,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  stat: { flex: 1 },
  statNum: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.leaf,
  },
  statLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkMuted,
  },
  section: { marginBottom: spacing.lg },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.ink,
  },
  sectionSub: {
    fontFamily: fonts.body,
    color: colors.inkMuted,
    marginBottom: spacing.sm,
  },
  muted: {
    fontFamily: fonts.body,
    color: colors.inkMuted,
    marginTop: spacing.sm,
  },
  errorBox: {
    backgroundColor: '#F7E8E8',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    fontFamily: fonts.body,
    color: colors.danger,
  },
});
