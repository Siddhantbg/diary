import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { MOOD_EMOJIS, parseDateKey } from '@/lib/dates';
import { fonts, radius, spacing } from '@/constants/theme';
import { DraftIcon } from '@/components/icons/DraftIcon';

export type HomeListItem = {
  date: string;
  mood: number | null;
  isDraft: boolean;
  isFavorite?: boolean;
  /** Soft status under month when not a pure draft */
  statusLabel?: string;
};

type Props = {
  item: HomeListItem;
};

/**
 * Minimal home row: large day · month + draft/status · mood
 * Matches reference list cards.
 */
export function HomeEntryCard({ item }: Props) {
  const { tokens, isDark } = useTheme();
  const d = parseDateKey(item.date);
  const dayNum = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  const moodFace = item.mood ? MOOD_EMOJIS[item.mood] : '😐';

  const status = item.isDraft
    ? 'Draft'
    : item.statusLabel
      ? item.statusLabel
      : item.isFavorite
        ? 'Cherished'
        : '';

  return (
    <Link href={`/day/${item.date}`} asChild>
      <Pressable
        style={[
          styles.card,
          {
            backgroundColor: tokens.bgCard,
            borderColor: tokens.line,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${month} ${dayNum}${status ? `, ${status}` : ''}`}
      >
        <Text style={[styles.day, { color: tokens.text }]}>{dayNum}</Text>
        <View style={styles.mid}>
          <View style={styles.midTop}>
            <Text style={[styles.month, { color: tokens.textMuted }]}>{month}</Text>
            {status ? (
              <View style={styles.statusRow}>
                {item.isDraft ? (
                  <DraftIcon
                    variant={isDark ? 'dark' : 'light'}
                    color={tokens.textMuted}
                    fillColor={isDark ? 'rgba(197, 228, 245, 0.25)' : '#E1F5FE'}
                    size={16}
                  />
                ) : (
                  <Text style={[styles.statusIcon, { color: tokens.textSubtle }]}>▣</Text>
                )}
                <Text style={[styles.status, { color: tokens.textMuted }]}>{status}</Text>
              </View>
            ) : null}
          </View>
        </View>
        <View
          style={[
            styles.mood,
            {
              backgroundColor: item.mood
                ? 'rgba(255, 200, 80, 0.18)'
                : 'rgba(255,255,255,0.06)',
            },
          ]}
        >
          <Text style={styles.moodFace}>{moodFace}</Text>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    marginBottom: 10,
    minHeight: 72,
  },
  day: {
    fontFamily: fonts.display,
    fontSize: 34,
    lineHeight: 40,
    minWidth: 52,
    letterSpacing: -0.5,
  },
  mid: {
    flex: 1,
    paddingHorizontal: 4,
  },
  midTop: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  month: {
    fontFamily: fonts.body,
    fontSize: 15,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusIcon: {
    fontSize: 12,
  },
  status: {
    fontFamily: fonts.body,
    fontSize: 14,
  },
  mood: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodFace: {
    fontSize: 22,
  },
});
