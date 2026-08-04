import React from 'react';
import { View } from 'react-native';

type Props = {
  color?: string;
  /** 'dark' → white (for dark themes); 'light' → black (for light themes) */
  variant?: 'dark' | 'light';
  size?: number;
};

/**
 * Padlock outline matching assets/lock-{dark|light}-theme.svg
 * (shackle + body + keyhole). Built with Views — no react-native-svg.
 */
export function LockIcon({ color, variant = 'dark', size = 22 }: Props) {
  const strokeColor = color ?? (variant === 'dark' ? '#FFFFFF' : '#000000');
  const stroke = Math.max(1.5, size * 0.085);

  const bodyW = size * 0.72;
  const bodyH = size * 0.5;
  const bodyTop = size * 0.38;
  const bodyLeft = (size - bodyW) / 2;
  const bodyRadius = size * 0.14;

  const shackleW = size * 0.42;
  const shackleH = size * 0.34;
  const shackleLeft = (size - shackleW) / 2;
  const shackleTop = size * 0.08;

  const hole = size * 0.14;
  const stemH = size * 0.12;

  return (
    <View
      style={{ width: size, height: size }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {/* Shackle (U inverted) */}
      <View
        style={{
          position: 'absolute',
          left: shackleLeft,
          top: shackleTop,
          width: shackleW,
          height: shackleH,
          borderTopLeftRadius: shackleW / 2,
          borderTopRightRadius: shackleW / 2,
          borderLeftWidth: stroke,
          borderRightWidth: stroke,
          borderTopWidth: stroke,
          borderBottomWidth: 0,
          borderColor: strokeColor,
          backgroundColor: 'transparent',
        }}
      />
      {/* Body */}
      <View
        style={{
          position: 'absolute',
          left: bodyLeft,
          top: bodyTop,
          width: bodyW,
          height: bodyH,
          borderRadius: bodyRadius,
          borderWidth: stroke,
          borderColor: strokeColor,
          backgroundColor: 'transparent',
        }}
      />
      {/* Keyhole circle */}
      <View
        style={{
          position: 'absolute',
          left: (size - hole) / 2,
          top: bodyTop + bodyH * 0.28,
          width: hole,
          height: hole,
          borderRadius: hole / 2,
          borderWidth: stroke,
          borderColor: strokeColor,
          backgroundColor: 'transparent',
        }}
      />
      {/* Keyhole stem */}
      <View
        style={{
          position: 'absolute',
          left: (size - stroke) / 2,
          top: bodyTop + bodyH * 0.28 + hole * 0.65,
          width: stroke,
          height: stemH,
          borderRadius: stroke / 2,
          backgroundColor: strokeColor,
        }}
      />
    </View>
  );
}
