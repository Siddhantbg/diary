import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { DiaryEntry } from '@/lib/api';
import { formatShortDate, MOOD_LABELS } from '@/lib/dates';
import { useTheme } from '@/context/ThemeContext';
import { fonts, spacing } from '@/constants/theme';

type Props = {
  entry: DiaryEntry;
};

export function EntryCard({ entry }: Props) {
  const { tokens } = useTheme();
  const logs = entry.logs || [];
  const latest = logs.length ? logs[logs.length - 1].text : entry.body || '';
  const preview = latest.replace(/\s+/g, ' ').trim();

  return (
    <Link href={`/day/${entry.date}`} asChild>
      <Pressable style={[styles.row, { borderBottomColor: tokens.line }]}>
        <View style={styles.meta}>
          <Text style={[styles.date, { color: tokens.textMuted }]}>
            {formatShortDate(entry.date)}
          </Text>
          {entry.favorite ? (
            <Text style={[styles.star, { color: tokens.favorite }]}>★</Text>
          ) : null}
        </View>
        <Text style={[styles.title, { color: tokens.text }]} numberOfLines={1}>
          {entry.title || 'Untitled day'}
        </Text>
        {!!preview && (
          <Text style={[styles.body, { color: tokens.textMuted }]} numberOfLines={2}>
            {preview}
          </Text>
        )}
        <View style={styles.footer}>
          {logs.length ? (
            <Text
              style={[
                styles.chip,
                { color: tokens.accent, backgroundColor: tokens.accentSoft },
              ]}
            >
              {logs.length} log{logs.length > 1 ? 's' : ''}
            </Text>
          ) : null}
          {entry.mood ? (
            <Text
              style={[
                styles.chip,
                { color: tokens.accent, backgroundColor: tokens.accentSoft },
              ]}
            >
              {MOOD_LABELS[entry.mood]}
            </Text>
          ) : null}
          {entry.photoIds?.length ? (
            <Text
              style={[
                styles.chip,
                { color: tokens.accent, backgroundColor: tokens.accentSoft },
              ]}
            >
              {entry.photoIds.length} photo
              {entry.photoIds.length > 1 ? 's' : ''}
            </Text>
          ) : null}
          {entry.people?.slice(0, 2).map((p) => (
            <Text
              key={p}
              style={[
                styles.chip,
                { color: tokens.accent, backgroundColor: tokens.accentSoft },
              ]}
            >
              {p}
            </Text>
          ))}
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  date: {
    fontFamily: fonts.body,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  star: {
    fontSize: 14,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 20,
    marginBottom: 4,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  chip: {
    fontFamily: fonts.body,
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: 'hidden',
    borderRadius: 4,
  },
});
