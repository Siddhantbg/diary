import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/context/ThemeContext';
import { fonts, radius, spacing } from '@/constants/theme';

const DISMISS_KEY = 'mydiary_home_habit_banner_dismissed_v1';

type Props = {
  onWrite: () => void;
};

/** Overlay challenge card matching reference home promo. */
export function HabitChallengeBanner({ onWrite }: Props) {
  const { tokens } = useTheme();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const v = await AsyncStorage.getItem(DISMISS_KEY);
        setVisible(v !== '1');
      } catch {
        setVisible(true);
      }
    })();
  }, []);

  const dismiss = async () => {
    setVisible(false);
    try {
      await AsyncStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // ignore
    }
  };

  if (!visible) return null;

  return (
    <Pressable
      onPress={onWrite}
      style={[
        styles.card,
        {
          backgroundColor: tokens.bgCard,
          borderColor: tokens.line,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel="3 day habit challenge — write diary now"
    >
      <Pressable
        onPress={() => void dismiss()}
        hitSlop={10}
        style={styles.close}
        accessibilityLabel="Dismiss challenge"
      >
        <Text style={{ color: tokens.textSubtle, fontSize: 16 }}>✕</Text>
      </Pressable>

      <View style={styles.copy}>
        <Text style={[styles.title, { color: tokens.text }]}>3-Day Habit Challenge</Text>
        <Text style={[styles.sub, { color: tokens.textMuted }]}>
          Build diary habit for a special gift. Write diary now!
        </Text>
      </View>

      <View style={styles.gifts} pointerEvents="none">
        <View style={[styles.box, styles.boxBack, { backgroundColor: '#6B4C9A' }]}>
          <Text style={styles.q}>?</Text>
        </View>
        <View style={[styles.box, styles.boxFront, { backgroundColor: '#8B5FC7' }]}>
          <Text style={styles.q}>?</Text>
          <View style={[styles.star, { backgroundColor: tokens.favorite }]} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    paddingRight: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: -28,
    minHeight: 92,
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  close: {
    position: 'absolute',
    top: 8,
    right: 10,
    zIndex: 2,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    paddingRight: 8,
    paddingTop: 4,
  },
  title: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    marginBottom: 4,
  },
  sub: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    paddingRight: 40,
  },
  gifts: {
    width: 72,
    height: 64,
    marginRight: 4,
  },
  box: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxBack: {
    right: 18,
    top: 4,
    transform: [{ rotate: '-12deg' }],
    opacity: 0.85,
  },
  boxFront: {
    right: 0,
    top: 14,
    transform: [{ rotate: '8deg' }],
  },
  q: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 18,
    fontFamily: fonts.bodyMedium,
  },
  star: {
    position: 'absolute',
    top: -4,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 2,
    transform: [{ rotate: '20deg' }],
  },
});
