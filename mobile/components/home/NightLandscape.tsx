import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

type Props = {
  /** Dim lower area so list content stays readable */
  dimBottom?: boolean;
};

const { width: W } = Dimensions.get('window');

/** Procedural night scene: sky, stars, mountains, house glow — no asset required. */
export function NightLandscape({ dimBottom }: Props) {
  const { tokens, isDark } = useTheme();
  const twinkle = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(twinkle, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(twinkle, { toValue: 0.3, duration: 1800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [twinkle]);

  const stars = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        key: i,
        left: ((i * 73) % 97) + 1.5,
        top: ((i * 41) % 52) + 2,
        size: 1.2 + (i % 4) * 0.7,
        bright: i % 5 === 0,
      })),
    []
  );

  const skyTop = isDark
    ? tokens.illustration?.sky?.[0] || tokens.headerIllustration || tokens.bg
    : tokens.illustration?.sky?.[0] || '#1a2744';
  const skyMid = isDark
    ? tokens.illustration?.sky?.[1] || tokens.bg
    : tokens.illustration?.sky?.[1] || '#243656';
  const skyLow = isDark
    ? tokens.illustration?.sky?.[2] || tokens.illustration?.sky?.[1] || '#152238'
    : tokens.illustration?.sky?.[2] || '#2a3d5c';
  const mountainFar = tokens.illustration?.mountain || (isDark ? '#0A1424' : '#1a2840');
  const mountainNear = tokens.illustration?.ground || (isDark ? '#06101C' : '#121f33');
  const house = isDark ? '#0C1526' : '#182638';
  const windowGlow = '#FFE6A0';
  const moonColor =
    tokens.illustration?.orb ||
    (isDark ? 'rgba(255,255,255,0.88)' : 'rgba(255,240,200,0.55)');

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: skyTop }]} />
      <View
        style={[
          styles.band,
          { top: '12%', height: '30%', backgroundColor: skyMid, opacity: 0.85 },
        ]}
      />
      <View
        style={[
          styles.band,
          { top: '36%', height: '40%', backgroundColor: skyLow, opacity: 0.95 },
        ]}
      />

      <View style={[styles.moon, { backgroundColor: moonColor }]} />

      {stars.map((s) =>
        s.bright ? (
          <Animated.View
            key={s.key}
            style={{
              position: 'absolute',
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: s.size,
              height: s.size,
              borderRadius: s.size,
              backgroundColor: '#FFFFFF',
              opacity: twinkle,
            }}
          />
        ) : (
          <View
            key={s.key}
            style={{
              position: 'absolute',
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: s.size,
              height: s.size,
              borderRadius: s.size,
              backgroundColor: '#FFFFFF',
              opacity: 0.4,
            }}
          />
        )
      )}

      <View style={styles.shoot} />

      <View style={[styles.mountainRow, { bottom: '18%' }]}>
        <View
          style={[
            styles.peak,
            {
              borderBottomColor: mountainFar,
              borderLeftWidth: W * 0.28,
              borderRightWidth: W * 0.28,
              borderBottomWidth: W * 0.18,
              left: -W * 0.08,
            },
          ]}
        />
        <View
          style={[
            styles.peak,
            {
              borderBottomColor: mountainFar,
              borderLeftWidth: W * 0.32,
              borderRightWidth: W * 0.3,
              borderBottomWidth: W * 0.22,
              left: W * 0.28,
              opacity: 0.92,
            },
          ]}
        />
        <View
          style={[
            styles.peak,
            {
              borderBottomColor: mountainFar,
              borderLeftWidth: W * 0.22,
              borderRightWidth: W * 0.36,
              borderBottomWidth: W * 0.16,
              left: W * 0.55,
            },
          ]}
        />
      </View>

      <View style={[styles.mountainRow, { bottom: '6%' }]}>
        <View
          style={[
            styles.peak,
            {
              borderBottomColor: mountainNear,
              borderLeftWidth: W * 0.4,
              borderRightWidth: W * 0.28,
              borderBottomWidth: W * 0.2,
              left: -W * 0.12,
            },
          ]}
        />
        <View
          style={[
            styles.peak,
            {
              borderBottomColor: mountainNear,
              borderLeftWidth: W * 0.28,
              borderRightWidth: W * 0.34,
              borderBottomWidth: W * 0.18,
              left: W * 0.42,
            },
          ]}
        />
      </View>

      <View style={[styles.ground, { backgroundColor: mountainNear }]} />

      <View style={styles.houseWrap}>
        <View style={[styles.roof, { borderBottomColor: house }]} />
        <View style={[styles.houseBody, { backgroundColor: house }]}>
          <View style={[styles.window, { backgroundColor: windowGlow }]} />
          <View style={[styles.window, { backgroundColor: windowGlow, opacity: 0.75 }]} />
        </View>
        <View style={styles.glow} />
      </View>

      <View style={[styles.tree, { left: '58%', bottom: '10%' }]}>
        <View style={[styles.treeCone, { borderBottomColor: mountainNear }]} />
        <View style={[styles.treeTrunk, { backgroundColor: mountainNear }]} />
      </View>
      <View style={[styles.tree, { left: '68%', bottom: '9%' }]}>
        <View
          style={[
            styles.treeCone,
            {
              borderBottomColor: mountainNear,
              borderLeftWidth: 10,
              borderRightWidth: 10,
              borderBottomWidth: 22,
            },
          ]}
        />
        <View style={[styles.treeTrunk, { backgroundColor: mountainNear }]} />
      </View>

      {dimBottom ? (
        <View style={[styles.bottomDim, { backgroundColor: tokens.bg }]} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  moon: {
    position: 'absolute',
    top: '10%',
    right: '14%',
    width: 28,
    height: 28,
    borderRadius: 14,
    opacity: 0.85,
  },
  shoot: {
    position: 'absolute',
    top: '16%',
    left: '22%',
    width: 42,
    height: 1.5,
    backgroundColor: 'rgba(255,255,255,0.45)',
    transform: [{ rotate: '-28deg' }],
    borderRadius: 2,
  },
  mountainRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 120,
  },
  peak: {
    position: 'absolute',
    bottom: 0,
    width: 0,
    height: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderStyle: 'solid',
  },
  ground: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '10%',
  },
  houseWrap: {
    position: 'absolute',
    bottom: '9%',
    left: '20%',
    width: 44,
    height: 40,
    alignItems: 'center',
  },
  roof: {
    width: 0,
    height: 0,
    borderLeftWidth: 24,
    borderRightWidth: 24,
    borderBottomWidth: 14,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginBottom: -1,
  },
  houseBody: {
    width: 36,
    height: 22,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  window: {
    width: 8,
    height: 8,
    borderRadius: 1,
  },
  glow: {
    position: 'absolute',
    bottom: 6,
    left: 4,
    right: 4,
    height: 12,
    backgroundColor: 'rgba(255, 210, 120, 0.25)',
    borderRadius: 16,
    zIndex: -1,
  },
  tree: {
    position: 'absolute',
    alignItems: 'center',
  },
  treeCone: {
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderBottomWidth: 26,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  treeTrunk: {
    width: 4,
    height: 6,
    marginTop: -1,
  },
  bottomDim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '42%',
    opacity: 0.72,
  },
});
