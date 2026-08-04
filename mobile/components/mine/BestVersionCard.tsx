import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts, spacing } from '@/constants/theme';

const GIRL = require('../../assets/images/best-version-girl.png');

type Props = {
  onMore: () => void;
};

/**
 * “Be the best version of you” — title stays clear of the art; girl ~3–5% smaller.
 */
export function BestVersionCard({ onMore }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.moon} />
      <View style={styles.moonCut} />
      <View style={[styles.star, { top: 26, right: 78 }]} />
      <View style={[styles.star, { top: 46, right: 116, width: 2, height: 2, opacity: 0.45 }]} />
      <View style={[styles.star, { top: 36, right: 48, width: 2, height: 2, opacity: 0.35 }]} />

      <View style={[styles.cloud, styles.cloudBack]} />
      <View style={[styles.cloud, styles.cloudMid]} />
      <View style={[styles.cloud, styles.cloudFront]} />

      {/* Title band above the illustration so text never hits her face */}
      <View style={styles.titleBand}>
        <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
          Be the best version of you
        </Text>
      </View>

      <Image source={GIRL} style={styles.girl} resizeMode="contain" />

      <Pressable
        onPress={onMore}
        accessibilityRole="button"
        accessibilityLabel="Learn more"
        style={({ pressed }) => [
          styles.moreBtn,
          { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
        ]}
      >
        <Text style={styles.moreLabel}>MORE</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0B1428',
    borderRadius: 22,
    overflow: 'hidden',
    minHeight: 186,
    marginBottom: spacing.md,
    position: 'relative',
  },
  titleBand: {
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: 2,
    zIndex: 4,
    // Full width of card so the headline can stay one line
    maxWidth: '100%',
    paddingRight: 100,
  },
  title: {
    fontFamily: fonts.bodyMedium,
    fontSize: 17,
    lineHeight: 22,
    color: '#FFFFFF',
  },
  moon: {
    position: 'absolute',
    top: 18,
    right: 56,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(230,236,255,0.9)',
    zIndex: 2,
  },
  moonCut: {
    position: 'absolute',
    top: 14,
    right: 50,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#0B1428',
    zIndex: 2,
  },
  star: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.7)',
    zIndex: 2,
  },
  cloud: {
    position: 'absolute',
    borderRadius: 999,
    zIndex: 1,
  },
  cloudBack: {
    left: -20,
    right: -10,
    bottom: -20,
    height: 86,
    backgroundColor: '#152445',
  },
  cloudMid: {
    left: 40,
    width: 160,
    height: 66,
    bottom: 26,
    backgroundColor: '#1A2C52',
    opacity: 0.9,
  },
  cloudFront: {
    right: -30,
    width: 180,
    height: 76,
    bottom: -10,
    backgroundColor: '#1E335E',
  },
  // ~4% smaller than before; sits lower so face stays under text band
  girl: {
    position: 'absolute',
    left: 2,
    bottom: 0,
    width: '66%',
    height: 136,
    zIndex: 3,
  },
  moreBtn: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    backgroundColor: '#5B8AD3',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 10,
    zIndex: 5,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  moreLabel: {
    color: '#FFFFFF',
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    letterSpacing: 1.3,
  },
});
