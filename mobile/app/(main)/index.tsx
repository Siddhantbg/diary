import React, { useCallback, useMemo, useState } from 'react';
import {
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettings } from '@/context/SettingsContext';
import { useTheme } from '@/context/ThemeContext';
import { useDrawerShell } from '@/context/DrawerShellContext';
import { DiaryEntry, friendlyApiMessage } from '@/lib/api';
import { draftHasWork, listAllDrafts, type EntryDraft } from '@/lib/entryDraft';
import { NightLandscape } from '@/components/home/NightLandscape';
import { HabitChallengeBanner } from '@/components/home/HabitChallengeBanner';
import { HomeEntryCard, type HomeListItem } from '@/components/home/HomeEntryCard';
import { ErrorBlock, LoadingBlock } from '@/components/ui/StateViews';
import { toDateKey } from '@/lib/dates';
import { fonts, spacing } from '@/constants/theme';
import { ActionSheet, SheetAction } from '@/components/ui/ActionSheet';

const HERO_H = Math.round(Dimensions.get('window').height * 0.34);

export default function HomeScreen() {
  const { api } = useSettings();
  const { tokens, isDark } = useTheme();
  const { openDrawer } = useDrawerShell();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [drafts, setDrafts] = useState<Record<string, EntryDraft>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sheet, setSheet] = useState<{
    title: string;
    message?: string;
    actions: SheetAction[];
  } | null>(null);

  const today = toDateKey();

  const load = useCallback(async () => {
    setError('');
    try {
      const [list, draftMap] = await Promise.all([
        api.listEntries(40),
        listAllDrafts(),
      ]);
      setEntries(list);
      setDrafts(draftMap);
    } catch (e: unknown) {
      setError(friendlyApiMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [api]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const items = useMemo((): HomeListItem[] => {
    const byDate = new Map<string, HomeListItem>();

    for (const e of entries) {
      const local = drafts[e.date];
      const isDraft = local ? draftHasWork(local) : false;
      const mood = isDraft && local?.mood != null ? local.mood : e.mood ?? null;
      byDate.set(e.date, {
        date: e.date,
        mood,
        isDraft,
        isFavorite: !!e.favorite,
      });
    }

    for (const [date, draft] of Object.entries(drafts)) {
      if (byDate.has(date)) continue;
      byDate.set(date, {
        date,
        mood: draft.mood,
        isDraft: true,
      });
    }

    return Array.from(byDate.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [entries, drafts]);

  const grouped = useMemo(() => {
    const map = new Map<string, HomeListItem[]>();
    for (const item of items) {
      const y = item.date.slice(0, 4);
      const list = map.get(y) || [];
      list.push(item);
      map.set(y, list);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [items]);

  const openToday = () => router.push(`/day/${today}`);

  const iconColor = isDark ? 'rgba(255,255,255,0.92)' : tokens.text;

  if (loading) {
    return (
      <View style={[styles.flex, { backgroundColor: tokens.bg }]}>
        <View style={[styles.hero, { height: HERO_H }]}>
          <NightLandscape />
        </View>
        <LoadingBlock message="Waking diary…" style={{ marginTop: spacing.xl }} />
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: tokens.bg }]}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={tokens.accent}
          />
        }
      >
        {/* Hero landscape + floating chrome */}
        <View style={[styles.hero, { height: HERO_H }]}>
          <NightLandscape />
          <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
            <Pressable
              onPress={openDrawer}
              hitSlop={12}
              style={styles.iconBtn}
              accessibilityLabel="Open menu"
            >
              <Text style={[styles.icon, { color: iconColor }]}>☰</Text>
            </Pressable>
            <View style={styles.topRight}>
              <Pressable
                onPress={() =>
                  setSheet({
                    title: 'Gifts',
                    message: 'Habit rewards and packs will unlock as you write.',
                    actions: [
                      { key: 'ok', label: 'Got it', icon: '✓', onPress: () => undefined },
                    ],
                  })
                }
                hitSlop={10}
                style={styles.iconBtn}
                accessibilityLabel="Gifts"
              >
                <Text style={{ fontSize: 20 }}>🎁</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push('/search')}
                hitSlop={10}
                style={styles.iconBtn}
                accessibilityLabel="Search"
              >
                <Text style={[styles.icon, { color: iconColor }]}>⌕</Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  setSheet({
                    title: 'Home',
                    message: 'Tap + to write today. Drafts auto-save if you leave midway.',
                    actions: [
                      {
                        key: 'today',
                        label: 'Write today',
                        icon: '✎',
                        onPress: openToday,
                      },
                      {
                        key: 'ok',
                        label: 'Got it',
                        icon: '✓',
                        cancel: true,
                        onPress: () => undefined,
                      },
                    ],
                  })
                }
                hitSlop={10}
                style={styles.iconBtn}
                accessibilityLabel="More"
              >
                <Text style={[styles.icon, { color: iconColor }]}>···</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <HabitChallengeBanner onWrite={openToday} />

        <View style={styles.listPad}>
          {!!error && (
            <ErrorBlock
              message={error}
              onRetry={() => {
                setRefreshing(true);
                load();
              }}
            />
          )}

          {!error && items.length === 0 ? (
            <Pressable onPress={openToday} style={styles.emptyBlock}>
              <Text style={[styles.emptyTitle, { color: tokens.text }]}>Your diary is open</Text>
              <Text style={[styles.emptySub, { color: tokens.textMuted }]}>
                Tap + or here to write today’s first moment.
              </Text>
            </Pressable>
          ) : (
            grouped.map(([year, yearItems]) => (
              <View key={year} style={styles.yearBlock}>
                <Text style={[styles.year, { color: tokens.textSubtle }]}>{year}</Text>
                {yearItems.map((item) => (
                  <HomeEntryCard key={item.date} item={item} />
                ))}
              </View>
            ))
          )}
        </View>
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
  flex: { flex: 1 },
  hero: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#0B1428',
  },
  topBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 22,
    fontFamily: fonts.bodyMedium,
  },
  listPad: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  yearBlock: {
    marginBottom: spacing.md,
  },
  year: {
    fontFamily: fonts.body,
    fontSize: 13,
    marginBottom: spacing.sm,
    marginLeft: 2,
  },
  emptyBlock: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    marginBottom: 6,
  },
  emptySub: {
    fontFamily: fonts.body,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
