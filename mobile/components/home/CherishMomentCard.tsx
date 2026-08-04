import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { fonts, radius, spacing } from '@/constants/theme';

const DIARY = require('../../assets/images/diary-brand.png');

type Props = {
  onPress: () => void;
  /** Smaller card when home already has diary content */
  compact?: boolean;
};

/** Speech-style empty/hero card — diary brand art + “Cherish every moment.” */
export function CherishMomentCard({ onPress, compact }: Props) {
  const { tokens } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Start writing today"
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: tokens.bgCard,
          borderColor: tokens.line,
          opacity: pressed ? 0.92 : 1,
          padding: compact ? spacing.md : spacing.lg,
        },
      ]}
    >
      <View
        style={[
          styles.art,
          {
            height: compact ? 100 : 140,
            backgroundColor: tokens.bgElevated,
            borderColor: tokens.line,
          },
        ]}
      >
        <Image
          source={DIARY}
          style={[styles.diary, { height: compact ? 88 : 124 }]}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      </View>

      <Text
        style={[
          styles.headline,
          {
            color: tokens.text,
            fontSize: compact ? 22 : 26,
            marginTop: compact ? spacing.sm : spacing.md,
          },
        ]}
      >
        Cherish every moment.
      </Text>
      <Text style={[styles.sub, { color: tokens.textMuted }]}>
        {compact ? 'Tap to write today' : 'Tap to start writing your diary'}
      </Text>

      {/* Speech tail */}
      <View
        style={[
          styles.tail,
          {
            borderTopColor: tokens.bgCard,
          },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  art: {
    width: '100%',
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  diary: {
    width: '70%',
  },
  headline: {
    fontFamily: fonts.displayItalic,
    textAlign: 'center',
  },
  sub: {
    fontFamily: fonts.body,
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
  },
  tail: {
    position: 'absolute',
    bottom: -10,
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderTopWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});
