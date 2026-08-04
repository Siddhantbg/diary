import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSettings } from '@/context/SettingsContext';
import { useTheme } from '@/context/ThemeContext';
import { DayMarker, DiaryEntry, Stats } from '@/lib/api';
import { fonts, radius, spacing } from '@/constants/theme';
import { MOOD_COLORS, MOOD_EMOJIS, MOOD_IDS, shiftDateKey, toDateKey } from '@/lib/dates';
import {
  computeMoodInsights,
  moodEmoji,
  moodLabel,
  type MoodSample,
} from '@/lib/moodInsights';
import { NightLandscape } from '@/components/home/NightLandscape';
import { ActionSheet, SheetAction } from '@/components/ui/ActionSheet';
import { TemplatesPromptCard } from '@/components/mine/TemplatesPromptCard';
import { BestVersionCard } from '@/components/mine/BestVersionCard';
import { GalleryIcon } from '@/components/icons/GalleryIcon';

const QUOTES = [
  'Each day provides its own gifts.',
  'A diary means yes indeed.',
  'Write the life you are living.',
  'Small moments make a full book.',
];

type Achievement = {
  id: string;
  icon: React.ReactNode;
  label: string;
  unlocked: boolean;
};

export default function MineScreen() {
  const { api } = useSettings();
  const { tokens, isDark } = useTheme();
  const router = useRouter();

  const [stats, setStats] = useState<Stats | null>(null);
  const [weekMarkers, setWeekMarkers] = useState<Record<string, DayMarker>>({});
  const [moodSamples, setMoodSamples] = useState<MoodSample[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const today = toDateKey();
  const quote = useMemo(() => {
    const i = new Date().getDate() % QUOTES.length;
    return QUOTES[i];
  }, []);

  const weekDays = useMemo(() => {
    // Last 7 days ending today (oldest left)
    return Array.from({ length: 7 }, (_, i) => {
      const key = shiftDateKey(today, i - 6);
      const d = new Date(key + 'T12:00:00');
      return {
        key,
        label: d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3),
        dayNum: d.getDate(),
      };
    });
  }, [today]);

  const weekRangeLabel = useMemo(() => {
    if (weekDays.length < 2) return '';
    const a = weekDays[0];
    const b = weekDays[6];
    return `${a.dayNum}/${a.key.slice(5, 7)} – ${b.dayNum}/${b.key.slice(5, 7)}`;
  }, [weekDays]);

  const load = useCallback(async () => {
    setError('');
    try {
      const from = weekDays[0].key;
      const to = weekDays[6].key;
      const [st, markers, entries] = await Promise.all([
        api.stats(),
        api.markers(from, to),
        api.listEntries(80),
      ]);
      setStats(st);
      setWeekMarkers(markers);

      const samples: MoodSample[] = [];
      for (const e of entries as DiaryEntry[]) {
        if (e.mood && e.mood >= 1 && e.mood <= 10 && e.date) {
          samples.push({ date: e.date, mood: e.mood });
        }
      }
      setMoodSamples(samples);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [api, weekDays]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const moodInsights = useMemo(
    () => computeMoodInsights(moodSamples, weekDays.map((d) => d.key)),
    [moodSamples, weekDays]
  );

  const total = stats?.totalEntries ?? 0;
  const streak = stats?.streak ?? 0;
  const photos = stats?.daysWithPhotos ?? 0;
  const favorites = stats?.favorites ?? 0;

  const achievements: Achievement[] = [
    { id: 'apprentice', icon: '✎', label: 'Diary Apprentice', unlocked: total >= 1 },
    { id: 'will', icon: '▲', label: 'Will Power', unlocked: streak >= 3 },
    { id: 'growing', icon: '❀', label: 'Growing Strong', unlocked: total >= 7 },
    {
      id: 'lens',
      icon: (
        <GalleryIcon
          color={photos >= 1 ? tokens.accent : tokens.textMuted}
          variant={isDark ? 'dark' : 'light'}
          size={22}
        />
      ),
      label: 'Photo Memory',
      unlocked: photos >= 1,
    },
    { id: 'heart', icon: '♥', label: 'Heart Keeper', unlocked: favorites >= 1 },
  ];

  const moodMax = Math.max(1, ...moodInsights.counts.slice(1));
  const weekWritten = weekDays.filter((d) => weekMarkers[d.key]?.hasEntry).length;
  const habitLeft = Math.max(0, 3 - Math.min(streak, 3));
  const hasMoodData = moodInsights.totalWithMood > 0;
  const [sheet, setSheet] = useState<{
    title: string;
    message?: string;
    actions: SheetAction[];
  } | null>(null);

  const notice = (title: string, message: string) =>
    setSheet({
      title,
      message,
      actions: [{ key: 'ok', label: 'Got it', icon: '✓', onPress: () => undefined }],
    });

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: tokens.bg }]}>
        <ActivityIndicator color={tokens.accent} />
      </View>
    );
  }

  return (
    <>
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.bg }}
      contentContainerStyle={styles.content}
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
      {/* Sign-in stub */}
      <View style={styles.profileRow}>
        <View style={[styles.avatar, { backgroundColor: tokens.bgElevated, borderColor: tokens.line }]}>
          <Text style={{ fontSize: 28, color: tokens.textMuted }}>☺</Text>
          <View style={[styles.avatarPlus, { backgroundColor: tokens.accent }]}>
            <Text style={{ color: '#fff', fontSize: 11, fontFamily: fonts.bodyMedium }}>+</Text>
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.signIn, { color: tokens.text }]}>Sign in</Text>
          <Text style={{ fontFamily: fonts.body, color: tokens.textMuted, fontSize: 13 }}>
            Each day provides its own gifts.
          </Text>
        </View>
      </View>

      {!!error && (
        <Text style={{ color: tokens.danger, marginBottom: spacing.md, fontFamily: fonts.body }}>
          {error}
        </Text>
      )}

      {/* Habit challenge stub */}
      <View style={[styles.card, { backgroundColor: tokens.bgCard, borderColor: tokens.line }]}>
        <Text style={[styles.cardTitle, { color: tokens.text }]}>3-Day Habit Challenge</Text>
        <Text style={[styles.cardBody, { color: tokens.textMuted }]}>
          {habitLeft === 0
            ? 'You hit a 3-day streak — keep the gift of habit going.'
            : `Build diary habit for a special gift. ${habitLeft} more day${habitLeft === 1 ? '' : 's'} to unlock.`}
        </Text>
        <PrimaryChip
          label="Write diary now"
          onPress={() => router.push(`/day/${today}`)}
          color={tokens.accent}
        />
      </View>

      {/* Stats / keep writing card with landscape */}
      <View style={[styles.statsCard, { borderColor: tokens.line }]}>
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <NightLandscape />
        </View>
        <View style={styles.statsOverlay}>
          <View style={styles.statsTop}>
            <Text style={[styles.cardTitle, { color: '#FFFFFF' }]}>
              Keep writing for {Math.max(streak, 1)} Day{streak === 1 ? '' : 's'}
            </Text>
            <Pressable
              onPress={() =>
                notice('Share', 'Sharing your streak is coming soon.')
              }
              hitSlop={10}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 16 }}>↗</Text>
            </Pressable>
          </View>
          <Text style={styles.bigNum}>{total}</Text>
          <Text style={styles.diariesLabel}>Diaries</Text>
          <Text style={styles.quote}>{quote}</Text>
          <Text style={styles.statsMeta}>
            Streak {streak} · Photos {photos} · ★ {favorites}
          </Text>
        </View>
      </View>

      {/* Prompt card — templates CTA */}
      <TemplatesPromptCard onStart={() => router.push(`/day/${today}`)} />

      {/* Best version promo */}
      <BestVersionCard
        onMore={() =>
          notice('Be the best version of you', 'More personal growth prompts are coming soon.')
        }
      />

      {/* Achievements */}
      <View style={styles.sectionHead}>
        <Text style={[styles.sectionTitle, { color: tokens.text }]}>Achievements</Text>
        <Pressable onPress={() => notice('Achievements', 'More badges unlock as you write.')}>
          <Text style={{ fontFamily: fonts.body, color: tokens.textMuted, fontSize: 13 }}>MORE</Text>
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.achieveRow}
      >
        {achievements.map((a) => (
          <View key={a.id} style={styles.achieveItem}>
            <View
              style={[
                styles.badge,
                {
                  borderColor: a.unlocked ? tokens.accent : tokens.line,
                  backgroundColor: a.unlocked ? tokens.accentSoft : tokens.bgElevated,
                  opacity: a.unlocked ? 1 : 0.45,
                },
              ]}
            >
              {typeof a.icon === 'string' || typeof a.icon === 'number' ? (
                <Text style={{ fontSize: 22, color: a.unlocked ? tokens.accent : tokens.textMuted }}>
                  {a.icon}
                </Text>
              ) : (
                a.icon
              )}
            </View>
            <Text
              style={[styles.achieveLabel, { color: tokens.textMuted }]}
              numberOfLines={2}
            >
              {a.label}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Diary Statistics — week */}
      <View style={styles.sectionHead}>
        <Text style={[styles.sectionTitle, { color: tokens.text }]}>Diary Statistics</Text>
        <Text style={{ fontFamily: fonts.body, color: tokens.textMuted, fontSize: 12 }}>
          {weekRangeLabel}
        </Text>
      </View>
      <View style={[styles.card, { backgroundColor: tokens.bgCard, borderColor: tokens.line }]}>
        <Text style={[styles.cardBody, { color: tokens.textMuted, marginBottom: spacing.md }]}>
          {weekWritten} of 7 days written this week
        </Text>
        <View style={styles.weekRow}>
          {weekDays.map((d) => {
            const written = !!weekMarkers[d.key]?.hasEntry;
            const isToday = d.key === today;
            return (
              <Pressable
                key={d.key}
                onPress={() => router.push(`/day/${d.key}`)}
                style={styles.weekCell}
              >
                <View
                  style={[
                    styles.weekCircle,
                    {
                      borderColor: written ? tokens.accent : tokens.line,
                      backgroundColor: written ? tokens.accentSoft : 'transparent',
                    },
                    isToday && { borderColor: tokens.fab, borderWidth: 2 },
                  ]}
                >
                  <Text
                    style={{
                      fontFamily: fonts.display,
                      fontSize: 14,
                      color: written ? tokens.accent : tokens.textMuted,
                    }}
                  >
                    {written ? '1' : '0'}
                  </Text>
                </View>
                <Text style={[styles.weekDay, { color: tokens.textSubtle }]}>{d.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Mood statistics */}
      <View style={styles.sectionHead}>
        <Text style={[styles.sectionTitle, { color: tokens.text }]}>Mood Statistics</Text>
        <Text style={{ fontFamily: fonts.body, color: tokens.textMuted, fontSize: 12 }}>
          {hasMoodData ? `${moodInsights.totalWithMood} days` : 'Last entries'}
        </Text>
      </View>
      <View style={[styles.card, { backgroundColor: tokens.bgCard, borderColor: tokens.line }]}>
        {!hasMoodData ? (
          <Text style={[styles.cardBody, { color: tokens.textMuted }]}>
            Set moods on your days to see percentages, stability, and best weekdays.
          </Text>
        ) : (
          <>
            {/* Key metrics */}
            <View style={styles.insightRow}>
              <View
                style={[
                  styles.insightTile,
                  { backgroundColor: tokens.bgElevated, borderColor: tokens.line },
                ]}
              >
                <Text style={[styles.insightLabel, { color: tokens.textMuted }]}>
                  Upbeat mood %
                </Text>
                <Text style={[styles.insightValue, { color: tokens.accent }]}>
                  {moodInsights.positivePercent}%
                </Text>
                <Text style={[styles.insightHint, { color: tokens.textSubtle }]}>
                  Happy → Amazed share
                </Text>
              </View>
              <View
                style={[
                  styles.insightTile,
                  { backgroundColor: tokens.bgElevated, borderColor: tokens.line },
                ]}
              >
                <Text style={[styles.insightLabel, { color: tokens.textMuted }]}>
                  Mood stability
                </Text>
                <Text style={[styles.insightValue, { color: tokens.accent }]}>
                  {moodInsights.stability}%
                </Text>
                <Text style={[styles.insightHint, { color: tokens.textSubtle }]}>
                  {moodInsights.stabilityLabel}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.bestDayCard,
                { backgroundColor: tokens.bgElevated, borderColor: tokens.line },
              ]}
            >
              <Text style={[styles.insightLabel, { color: tokens.textMuted }]}>
                Best day in weeks
              </Text>
              {moodInsights.bestWeekday ? (
                <View style={styles.bestDayInner}>
                  <Text style={{ fontSize: 28 }}>
                    {moodEmoji(moodInsights.bestWeekday.topMood)}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.bestDayName, { color: tokens.text }]}>
                      {moodInsights.bestWeekday.name}
                    </Text>
                    <Text style={[styles.insightHint, { color: tokens.textSubtle }]}>
                      Highest average energy · {moodInsights.bestWeekday.sampleCount} day
                      {moodInsights.bestWeekday.sampleCount === 1 ? '' : 's'} · often{' '}
                      {moodLabel(moodInsights.bestWeekday.topMood)}
                    </Text>
                  </View>
                </View>
              ) : (
                <Text style={[styles.cardBody, { color: tokens.textMuted, marginTop: 6 }]}>
                  Keep logging moods to find your best weekday.
                </Text>
              )}

              {moodInsights.bestThisWeek ? (
                <View style={[styles.thisWeekPeak, { borderTopColor: tokens.line }]}>
                  <Text style={[styles.insightHint, { color: tokens.textMuted }]}>
                    This week’s peak
                  </Text>
                  <Pressable
                    onPress={() => router.push(`/day/${moodInsights.bestThisWeek!.date}`)}
                    style={styles.thisWeekPeakRow}
                  >
                    <Text style={{ fontSize: 18 }}>
                      {moodEmoji(moodInsights.bestThisWeek.mood)}
                    </Text>
                    <Text style={[styles.thisWeekPeakText, { color: tokens.text }]}>
                      {moodInsights.bestThisWeek.weekday} ·{' '}
                      {moodLabel(moodInsights.bestThisWeek.mood)}
                    </Text>
                    <Text style={{ color: tokens.accent, fontSize: 16 }}>›</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>

            {/* Percentage bars */}
            <Text
              style={[
                styles.insightLabel,
                { color: tokens.textMuted, marginTop: spacing.md, marginBottom: spacing.sm },
              ]}
            >
              Mood mix
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.moodBars}>
                {MOOD_IDS.map((n) => {
                  const count = moodInsights.counts[n];
                  const pct = moodInsights.percents[n];
                  const h = Math.max(6, Math.round((count / moodMax) * 72));
                  return (
                    <View key={n} style={styles.moodCol}>
                      <View
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 14,
                          backgroundColor: MOOD_COLORS[n],
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: 4,
                        }}
                      >
                        <Text style={{ fontSize: 14 }}>{MOOD_EMOJIS[n]}</Text>
                      </View>
                      <View
                        style={[
                          styles.moodBar,
                          {
                            height: h,
                            backgroundColor: MOOD_COLORS[n],
                            opacity: count ? 0.55 + (count / moodMax) * 0.45 : 0.2,
                          },
                        ]}
                      />
                      <Text style={[styles.moodCount, { color: tokens.text }]}>
                        {pct}%
                      </Text>
                      <Text style={[styles.moodName, { color: tokens.textSubtle }]}>
                        {count}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </>
        )}
      </View>

      {/* Shortcuts */}
      <View style={[styles.card, { backgroundColor: tokens.bgCard, borderColor: tokens.line }]}>
        <ShortcutRow
          label="Themes"
          onPress={() => router.push('/themes')}
          color={tokens.text}
          muted={tokens.textMuted}
        />
        <View style={[styles.hr, { backgroundColor: tokens.line }]} />
        <ShortcutRow
          label="Settings"
          onPress={() => router.push('/settings')}
          color={tokens.text}
          muted={tokens.textMuted}
        />
        <View style={[styles.hr, { backgroundColor: tokens.line }]} />
        <ShortcutRow
          label="Search memories"
          onPress={() => router.push('/search')}
          color={tokens.text}
          muted={tokens.textMuted}
        />
      </View>
    </ScrollView>
    <ActionSheet
      visible={!!sheet}
      title={sheet?.title ?? ''}
      message={sheet?.message}
      actions={sheet?.actions ?? []}
      onClose={() => setSheet(null)}
    />
    </>
  );
}

function PrimaryChip({
  label,
  onPress,
  color,
}: {
  label: string;
  onPress: () => void;
  color: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        alignSelf: 'flex-start',
        backgroundColor: color,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: radius.sm,
        marginTop: spacing.sm,
      }}
    >
      <Text style={{ color: '#fff', fontFamily: fonts.bodyMedium, fontSize: 13, letterSpacing: 0.6 }}>
        {label}
      </Text>
    </Pressable>
  );
}

function ShortcutRow({
  label,
  onPress,
  color,
  muted,
}: {
  label: string;
  onPress: () => void;
  color: string;
  muted: string;
}) {
  return (
    <Pressable onPress={onPress} style={styles.shortcut}>
      <Text style={{ fontFamily: fonts.body, fontSize: 16, color }}>{label}</Text>
      <Text style={{ color: muted, fontSize: 18 }}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: 56 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  avatarPlus: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signIn: {
    fontFamily: fonts.display,
    fontSize: 20,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    marginBottom: 6,
  },
  cardBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  statsCard: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    minHeight: 200,
    marginBottom: spacing.md,
  },
  statsOverlay: {
    padding: spacing.md,
    backgroundColor: 'rgba(8,14,28,0.42)',
    minHeight: 200,
  },
  statsTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bigNum: {
    fontFamily: fonts.display,
    fontSize: 56,
    lineHeight: 60,
    color: '#FFFFFF',
    marginTop: spacing.sm,
  },
  diariesLabel: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
  },
  quote: {
    fontFamily: fonts.displayItalic,
    fontSize: 15,
    color: 'rgba(255,255,255,0.92)',
    marginTop: spacing.md,
  },
  statsMeta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 8,
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
  },
  achieveRow: {
    gap: 14,
    paddingBottom: spacing.md,
  },
  achieveItem: {
    width: 88,
    alignItems: 'center',
  },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  achieveLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 14,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekCell: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  weekCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDay: {
    fontFamily: fonts.body,
    fontSize: 11,
  },
  moodBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingTop: spacing.sm,
    minHeight: 120,
    gap: 10,
    paddingHorizontal: 4,
  },
  moodCol: {
    width: 36,
    alignItems: 'center',
  },
  moodBar: {
    width: 14,
    borderRadius: 6,
    marginBottom: 4,
  },
  moodCount: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
  moodName: {
    fontFamily: fonts.body,
    fontSize: 10,
    marginTop: 1,
  },
  insightRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: spacing.sm,
  },
  insightTile: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.sm + 2,
  },
  insightLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  insightValue: {
    fontFamily: fonts.display,
    fontSize: 28,
    marginTop: 4,
  },
  insightHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  bestDayCard: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.sm + 2,
    marginBottom: spacing.xs,
  },
  bestDayInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  bestDayName: {
    fontFamily: fonts.display,
    fontSize: 20,
  },
  thisWeekPeak: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
  },
  thisWeekPeakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  thisWeekPeakText: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
  },
  shortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  hr: {
    height: StyleSheet.hairlineWidth,
  },
});
