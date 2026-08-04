import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { CalendarIcon } from '@/components/shell/CalendarIcon';
import { PersonIcon } from '@/components/shell/PersonIcon';
import { fonts } from '@/constants/theme';
import { toDateKey } from '@/lib/dates';

const SIDE_SIZE = 52;
const FAB_SIZE = 62;
const HALO_SIZE = 78;
const GLOW_SIZE = 96;

/**
 * Bottom nav matching design: circle Calendar | raised FAB + | circle Mine.
 */
export function MainTabBar({ state, navigation }: BottomTabBarProps) {
  const { tokens, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const calendarIndex = state.routes.findIndex((r) => r.name === 'calendar');
  const mineIndex = state.routes.findIndex((r) => r.name === 'mine');
  const active = state.routes[state.index]?.name;

  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [glow]);

  // Soft pulse: expand + fade breath
  const outerScale = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1.35],
  });
  const outerOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.18, 0.42],
  });
  const midScale = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1.18],
  });
  const midOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.32, 0.62],
  });

  const iconBase = isDark ? '#FFFFFF' : '#000000';
  const sideWell = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)';
  const sideWellActive = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.10)';

  const go = (name: string, index: number) => {
    const event = navigation.emit({
      type: 'tabPress',
      target: state.routes[index]?.key,
      canPreventDefault: true,
    });
    if (!event.defaultPrevented) {
      navigation.navigate(name);
    }
  };

  const SideBtn = ({
    name,
    label,
    index,
    icon,
  }: {
    name: string;
    label: string;
    index: number;
    icon: 'calendar' | 'mine';
  }) => {
    const isOn = active === name;
    const tint = isOn ? tokens.accent : iconBase;
    return (
      <Pressable
        style={styles.side}
        onPress={() => index >= 0 && go(name, index)}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected: isOn }}
      >
        <View
          style={[
            styles.sideCircle,
            {
              backgroundColor: isOn ? sideWellActive : sideWell,
            },
          ]}
        >
          {icon === 'calendar' ? (
            <CalendarIcon color={tint} variant={isDark ? 'dark' : 'light'} size={24} />
          ) : (
            <PersonIcon color={tint} variant={isDark ? 'dark' : 'light'} size={24} />
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: tokens.bgElevated,
          borderTopColor: tokens.line,
          paddingBottom: Math.max(insets.bottom, 16),
        },
      ]}
    >
      <SideBtn
        name="calendar"
        label="Calendar"
        index={calendarIndex}
        icon="calendar"
      />

      <View style={styles.fabSlot}>
        {/* Soft outer glow ring — pulses larger / softer */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.glowOuter,
            {
              backgroundColor: tokens.fab,
              opacity: outerOpacity,
              transform: [{ scale: outerScale }],
            },
          ]}
        />
        {/* Inner glow disc */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.glowMid,
            {
              backgroundColor: tokens.fab,
              opacity: midOpacity,
              transform: [{ scale: midScale }],
            },
          ]}
        />
        <Pressable
          onPress={() => router.push(`/day/${toDateKey()}`)}
          accessibilityRole="button"
          accessibilityLabel="Add entry"
          style={({ pressed }) => [
            styles.fab,
            {
              backgroundColor: tokens.fab,
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.94 : 1 }],
              shadowColor: tokens.fab,
            },
          ]}
        >
          <Text style={styles.fabPlus}>+</Text>
        </Pressable>
      </View>

      <SideBtn name="mine" label="Mine" index={mineIndex} icon="mine" />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    // Room for raised FAB + glow without clipping labels area
    paddingTop: 22,
    paddingHorizontal: 28,
    minHeight: 88,
    overflow: 'visible',
  },
  // Three equal columns → equal left/right spacing around center FAB
  side: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: SIDE_SIZE + 8,
  },
  sideCircle: {
    width: SIDE_SIZE,
    height: SIDE_SIZE,
    borderRadius: SIDE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: GLOW_SIZE,
    marginTop: -20,
    overflow: 'visible',
  },
  glowOuter: {
    position: 'absolute',
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    borderRadius: GLOW_SIZE / 2,
  },
  glowMid: {
    position: 'absolute',
    width: HALO_SIZE,
    height: HALO_SIZE,
    borderRadius: HALO_SIZE / 2,
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
    shadowOpacity: 0.55,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    zIndex: 2,
  },
  fabPlus: {
    color: '#FFFFFF',
    fontSize: 34,
    fontFamily: fonts.bodyMedium,
    marginTop: -2,
    lineHeight: 38,
  },
});
