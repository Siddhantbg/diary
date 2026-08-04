import React from 'react';
import { View } from 'react-native';

type Props = {
  color?: string;
  /** 'dark' → white (for dark themes); 'light' → black (for light themes) */
  variant?: 'dark' | 'light';
  size?: number;
};

/**
 * Calendar outline matching assets/calendar-{dark|light}-theme.svg
 * (rounded page, binder rings, two event lines). Built with Views.
 */
export function CalendarIcon({ color, variant = 'dark', size = 22 }: Props) {
  const stroke = color ?? (variant === 'dark' ? '#FFFFFF' : '#000000');
  const sw = Math.max(1.6, size * 0.09);

  const pageLeft = size * 0.16;
  const pageTop = size * 0.22;
  const pageW = size * 0.68;
  const pageH = size * 0.66;
  const pageR = size * 0.12;

  const ringW = size * 0.12;
  const ringH = size * 0.2;
  const ringTop = size * 0.08;

  return (
    <View
      style={{ width: size, height: size }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {/* Binder rings */}
      <View
        style={{
          position: 'absolute',
          left: size * 0.28,
          top: ringTop,
          width: ringW,
          height: ringH,
          borderRadius: ringW / 2,
          backgroundColor: stroke,
          zIndex: 2,
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: size * 0.28,
          top: ringTop,
          width: ringW,
          height: ringH,
          borderRadius: ringW / 2,
          backgroundColor: stroke,
          zIndex: 2,
        }}
      />
      {/* Page body outline */}
      <View
        style={{
          position: 'absolute',
          left: pageLeft,
          top: pageTop,
          width: pageW,
          height: pageH,
          borderRadius: pageR,
          borderWidth: sw,
          borderColor: stroke,
          backgroundColor: 'transparent',
        }}
      />
      {/* Event lines */}
      <View
        style={{
          position: 'absolute',
          left: size * 0.28,
          top: size * 0.46,
          width: size * 0.32,
          height: sw,
          borderRadius: sw / 2,
          backgroundColor: stroke,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: size * 0.28,
          top: size * 0.62,
          width: size * 0.4,
          height: sw,
          borderRadius: sw / 2,
          backgroundColor: stroke,
        }}
      />
    </View>
  );
}
