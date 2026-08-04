import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { fonts, spacing } from '@/constants/theme';
import { MOOD_COLORS, MOOD_EMOJIS, MOOD_IDS, MOOD_LABELS } from '@/lib/dates';

type Props = {
  value: number | null;
  onChange: (mood: number | null) => void;
};

/** Compact inline mood row (legacy; entry editor uses MoodSheet). */
export function MoodPicker({ value, onChange }: Props) {
  const { tokens } = useTheme();
  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: tokens.textMuted }]}>Mood</Text>
      <View style={styles.row}>
        {MOOD_IDS.map((n) => {
          const active = value === n;
          return (
            <Pressable
              key={n}
              onPress={() => onChange(active ? null : n)}
              style={[
                styles.dot,
                {
                  backgroundColor: MOOD_COLORS[n],
                  borderWidth: active ? 2 : 0,
                  borderColor: tokens.white,
                },
              ]}
              accessibilityLabel={MOOD_LABELS[n]}
            >
              <Text style={styles.emoji}>{MOOD_EMOJIS[n]}</Text>
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
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 20,
  },
});
