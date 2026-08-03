import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, spacing } from '@/constants/theme';
import { MOOD_LABELS } from '@/lib/dates';

type Props = {
  value: number | null;
  onChange: (mood: number | null) => void;
};

export function MoodPicker({ value, onChange }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Mood</Text>
      <View style={styles.row}>
        {[1, 2, 3, 4, 5].map((n) => {
          const active = value === n;
          return (
            <Pressable
              key={n}
              onPress={() => onChange(active ? null : n)}
              style={[styles.dot, active && styles.dotActive]}
            >
              <Text style={[styles.num, active && styles.numActive]}>{n}</Text>
              <Text style={[styles.caption, active && styles.captionActive]} numberOfLines={1}>
                {MOOD_LABELS[n]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginVertical: spacing.md,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  dot: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  dotActive: {
    borderColor: colors.leaf,
    backgroundColor: colors.leafSoft,
  },
  num: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.inkMuted,
  },
  numActive: {
    color: colors.leaf,
  },
  caption: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.inkMuted,
    marginTop: 2,
  },
  captionActive: {
    color: colors.ink,
  },
});
