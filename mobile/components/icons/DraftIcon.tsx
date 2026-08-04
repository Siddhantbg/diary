import React from 'react';
import { View } from 'react-native';

type Props = {
  /** Override stroke color (defaults from variant). */
  color?: string;
  /** Front page fill; defaults pale blue for light, soft cyan for dark. */
  fillColor?: string;
  /** 'dark' → white strokes; 'light' → steel blue. */
  variant?: 'dark' | 'light';
  size?: number;
};

/**
 * Overlapping draft pages matching assets/draft-{dark|light}-theme.svg
 * (back sheet, front with dog-ear, three text lines).
 */
export function DraftIcon({
  color,
  fillColor,
  variant = 'dark',
  size = 22,
}: Props) {
  const stroke = color ?? (variant === 'dark' ? '#FFFFFF' : '#4A86A8');
  const pageFill = fillColor ?? (variant === 'dark' ? '#C5E4F5' : '#E1F5FE');
  const sw = Math.max(1.6, size * 0.085);

  // Layout in icon pixel space
  const backL = size * 0.12;
  const backT = size * 0.22;
  const backW = size * 0.52;
  const backH = size * 0.64;
  const r = size * 0.1;

  const frontL = size * 0.28;
  const frontT = size * 0.1;
  const frontW = size * 0.52;
  const frontH = size * 0.7;
  const ear = size * 0.18;

  const lineX = frontL + size * 0.1;
  const lineYs = [frontT + size * 0.32, frontT + size * 0.46, frontT + size * 0.6];
  const lineWs = [size * 0.16, size * 0.32, size * 0.24];

  return (
    <View
      style={{ width: size, height: size }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {/* Back sheet */}
      <View
        style={{
          position: 'absolute',
          left: backL,
          top: backT,
          width: backW,
          height: backH,
          borderRadius: r,
          borderWidth: sw,
          borderColor: stroke,
          backgroundColor: 'transparent',
        }}
      />

      {/* Front sheet body */}
      <View
        style={{
          position: 'absolute',
          left: frontL,
          top: frontT + ear * 0.35,
          width: frontW,
          height: frontH - ear * 0.35,
          borderRadius: r,
          borderWidth: sw,
          borderColor: stroke,
          backgroundColor: pageFill,
        }}
      />
      {/* Top band of front sheet (left of dog-ear) */}
      <View
        style={{
          position: 'absolute',
          left: frontL,
          top: frontT,
          width: frontW - ear,
          height: ear * 0.55 + sw,
          borderTopLeftRadius: r,
          borderWidth: sw,
          borderBottomWidth: 0,
          borderRightWidth: 0,
          borderColor: stroke,
          backgroundColor: pageFill,
        }}
      />

      {/* Dog-ear triangle-ish (square rotated) */}
      <View
        style={{
          position: 'absolute',
          left: frontL + frontW - ear - sw,
          top: frontT + ear * 0.05,
          width: ear,
          height: ear,
          borderWidth: sw,
          borderColor: stroke,
          backgroundColor: pageFill,
          borderTopWidth: 0,
          borderRightWidth: 0,
          transform: [{ rotate: '0deg' }],
          borderBottomLeftRadius: 2,
        }}
      />
      {/* Fold lines */}
      <View
        style={{
          position: 'absolute',
          left: frontL + frontW - ear,
          top: frontT,
          width: sw,
          height: ear,
          backgroundColor: stroke,
          borderRadius: sw / 2,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: frontL + frontW - ear,
          top: frontT + ear - sw / 2,
          width: ear,
          height: sw,
          backgroundColor: stroke,
          borderRadius: sw / 2,
        }}
      />

      {/* Text lines */}
      {lineYs.map((y, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: lineX,
            top: y,
            width: lineWs[i],
            height: Math.max(2, sw * 0.85),
            borderRadius: sw,
            backgroundColor: stroke,
          }}
        />
      ))}
    </View>
  );
}
