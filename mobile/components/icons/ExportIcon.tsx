import React from 'react';
import { View } from 'react-native';

type Props = {
  color?: string;
  /** Color that punches through the fill (match parent background). */
  cutoutColor?: string;
  /** 'dark' → white fill default; 'light' → black. */
  variant?: 'dark' | 'light';
  size?: number;
};

/**
 * Storage box + export arrow matching assets/export-{dark|light}-theme.svg
 */
export function ExportIcon({
  color,
  cutoutColor = 'transparent',
  variant = 'dark',
  size = 22,
}: Props) {
  const fill = color ?? (variant === 'dark' ? '#FFFFFF' : '#000000');
  const cut = cutoutColor;

  const boxW = size * 0.82;
  const boxH = size * 0.78;
  const boxLeft = (size - boxW) / 2;
  const boxTop = (size - boxH) / 2 + size * 0.02;
  const radius = size * 0.12;
  const lidH = Math.max(2, size * 0.08);
  const stroke = Math.max(2, size * 0.11);

  return (
    <View
      style={{ width: size, height: size }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {/* Box body */}
      <View
        style={{
          position: 'absolute',
          left: boxLeft,
          top: boxTop,
          width: boxW,
          height: boxH,
          borderRadius: radius,
          backgroundColor: fill,
        }}
      />

      {/* Lid slot cutout */}
      <View
        style={{
          position: 'absolute',
          left: boxLeft + size * 0.06,
          top: boxTop + size * 0.16,
          width: boxW - size * 0.12,
          height: lidH,
          borderRadius: lidH / 2,
          backgroundColor: cut,
        }}
      />

      {/* Export arrow stem (curved approx as rotated thick bar) */}
      <View
        style={{
          position: 'absolute',
          left: size * 0.28,
          top: size * 0.42,
          width: size * 0.36,
          height: stroke,
          borderRadius: stroke / 2,
          backgroundColor: cut,
          transform: [{ rotate: '-42deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: size * 0.22,
          top: size * 0.58,
          width: size * 0.28,
          height: stroke,
          borderRadius: stroke / 2,
          backgroundColor: cut,
          transform: [{ rotate: '-55deg' }],
        }}
      />

      {/* Arrow head pointing up-right */}
      <View
        style={{
          position: 'absolute',
          left: size * 0.52,
          top: size * 0.28,
          width: 0,
          height: 0,
          borderLeftWidth: size * 0.1,
          borderRightWidth: size * 0.1,
          borderBottomWidth: size * 0.14,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: cut,
          transform: [{ rotate: '50deg' }],
        }}
      />
    </View>
  );
}
