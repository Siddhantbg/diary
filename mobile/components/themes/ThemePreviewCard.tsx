import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ThemePack } from '@/constants/themeCatalog';
import { fonts, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

type Props = {
  pack: ThemePack;
  selected: boolean;
  onApply: () => void;
};

/** 3-col gallery card: illustration header + mock shell + APPLY. */
export function ThemePreviewCard({ pack, selected, onApply }: Props) {
  const { tokens } = useTheme();
  const illus = pack.illustration;
  const skyTop = illus.sky[0];
  const skyMid = illus.sky[1] ?? illus.sky[0];
  const skyLow = illus.sky[2] ?? illus.sky[1] ?? illus.sky[0];

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onApply}
        style={({ pressed }) => [
          styles.preview,
          {
            borderColor: selected ? tokens.accent : pack.line,
            borderWidth: selected ? 2 : 1,
            transform: [{ scale: pressed ? 0.97 : 1 }],
            opacity: pressed ? 0.94 : 1,
          },
        ]}
      >
        {/* Illustration header */}
        <View style={[styles.header, { backgroundColor: skyTop }]}>
          <View style={[styles.skyBand, { top: '28%', backgroundColor: skyMid, opacity: 0.9 }]} />
          <View style={[styles.skyBand, { top: '55%', backgroundColor: skyLow, opacity: 0.95 }]} />
          <View
            style={[
              styles.orb,
              {
                backgroundColor: illus.orb,
                shadowColor: illus.orb,
              },
            ]}
          />
          {/* Far mountain triangles */}
          <View style={[styles.peak, { borderBottomColor: illus.mountain, left: -8 }]} />
          <View
            style={[
              styles.peak,
              {
                borderBottomColor: illus.ground,
                left: 28,
                borderLeftWidth: 36,
                borderRightWidth: 28,
                borderBottomWidth: 40,
              },
            ]}
          />
          <View style={[styles.ground, { backgroundColor: illus.ground }]} />

          {pack.free ? (
            <View style={styles.freeBadge}>
              <Text style={styles.freeText}>FREE</Text>
            </View>
          ) : null}
        </View>

        {/* Mock UI skeleton */}
        <View style={[styles.shell, { backgroundColor: pack.bg }]}>
          <View style={[styles.row, { backgroundColor: pack.bgCard, opacity: 0.9 }]} />
          <View style={[styles.row, { width: '70%', backgroundColor: pack.bgCard, opacity: 0.7 }]} />
          <View style={styles.nav}>
            <View style={[styles.navDot, { backgroundColor: pack.textMuted, opacity: 0.5 }]} />
            <View style={[styles.fab, { backgroundColor: pack.fab }]}>
              <Text style={styles.fabPlus}>+</Text>
            </View>
            <View style={[styles.navDot, { backgroundColor: pack.textMuted, opacity: 0.5 }]} />
          </View>
        </View>
      </Pressable>

      <Text style={[styles.name, { color: tokens.text }]} numberOfLines={1}>
        {pack.name}
      </Text>

      <Pressable
        onPress={onApply}
        style={[
          styles.apply,
          {
            backgroundColor: selected ? tokens.accentSoft : tokens.bgElevated,
            borderColor: selected ? tokens.accent : tokens.line,
          },
        ]}
      >
        <Text
          style={[
            styles.applyText,
            { color: selected ? tokens.accent : tokens.text },
          ]}
        >
          {selected ? '✓  SELECTED' : 'APPLY'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '31.5%',
    marginBottom: spacing.md,
  },
  preview: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  header: {
    height: 72,
    overflow: 'hidden',
  },
  skyBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: '40%',
  },
  orb: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 14,
    height: 14,
    borderRadius: 7,
    opacity: 0.9,
  },
  peak: {
    position: 'absolute',
    bottom: 10,
    width: 0,
    height: 0,
    borderLeftWidth: 30,
    borderRightWidth: 30,
    borderBottomWidth: 36,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  ground: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 12,
  },
  freeBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(255,255,255,0.88)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },
  freeText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 8,
    color: '#3B82F6',
    letterSpacing: 0.4,
  },
  shell: {
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 6,
  },
  row: {
    height: 8,
    borderRadius: 3,
    marginBottom: 5,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingHorizontal: 4,
  },
  navDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  fab: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -4,
  },
  fabPlus: {
    color: '#fff',
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
    marginTop: -1,
  },
  name: {
    fontFamily: fonts.body,
    fontSize: 11,
    marginTop: 6,
    marginBottom: 4,
    textAlign: 'center',
  },
  apply: {
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingVertical: 7,
    alignItems: 'center',
  },
  applyText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 0.6,
  },
});
