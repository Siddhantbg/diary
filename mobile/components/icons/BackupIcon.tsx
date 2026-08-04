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
 * Cloud + sync arrows matching assets/backup-{dark|light}-theme.svg
 */
export function BackupIcon({
  color,
  cutoutColor = 'transparent',
  variant = 'dark',
  size = 22,
}: Props) {
  const fill = color ?? (variant === 'dark' ? '#FFFFFF' : '#000000');
  const cut = cutoutColor;

  const cloudW = size * 0.9;
  const cloudH = size * 0.52;
  const cloudLeft = (size - cloudW) / 2;
  const cloudTop = size * 0.38;

  const syncR = size * 0.17;
  const syncCx = size / 2;
  const syncCy = size * 0.55;
  const ring = Math.max(1.8, size * 0.08);

  return (
    <View
      style={{ width: size, height: size }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {/* Left lobe */}
      <View
        style={{
          position: 'absolute',
          left: size * 0.1,
          top: size * 0.28,
          width: size * 0.34,
          height: size * 0.34,
          borderRadius: size * 0.17,
          backgroundColor: fill,
        }}
      />
      {/* Center top lobe */}
      <View
        style={{
          position: 'absolute',
          left: size * 0.3,
          top: size * 0.1,
          width: size * 0.4,
          height: size * 0.4,
          borderRadius: size * 0.2,
          backgroundColor: fill,
        }}
      />
      {/* Right lobe */}
      <View
        style={{
          position: 'absolute',
          left: size * 0.56,
          top: size * 0.26,
          width: size * 0.34,
          height: size * 0.34,
          borderRadius: size * 0.17,
          backgroundColor: fill,
        }}
      />
      {/* Cloud base */}
      <View
        style={{
          position: 'absolute',
          left: cloudLeft,
          top: cloudTop,
          width: cloudW,
          height: cloudH,
          borderBottomLeftRadius: cloudH * 0.5,
          borderBottomRightRadius: cloudH * 0.5,
          borderTopLeftRadius: cloudH * 0.35,
          borderTopRightRadius: cloudH * 0.35,
          backgroundColor: fill,
        }}
      />

      {/* Sync — top-right arc */}
      <View
        style={{
          position: 'absolute',
          left: syncCx - syncR,
          top: syncCy - syncR,
          width: syncR * 2,
          height: syncR * 2,
          borderRadius: syncR,
          borderWidth: ring,
          borderColor: 'transparent',
          borderTopColor: cut,
          borderRightColor: cut,
          transform: [{ rotate: '25deg' }],
        }}
      />
      {/* Sync — bottom-left arc */}
      <View
        style={{
          position: 'absolute',
          left: syncCx - syncR,
          top: syncCy - syncR,
          width: syncR * 2,
          height: syncR * 2,
          borderRadius: syncR,
          borderWidth: ring,
          borderColor: 'transparent',
          borderBottomColor: cut,
          borderLeftColor: cut,
          transform: [{ rotate: '25deg' }],
        }}
      />

      {/* Top arrow tip */}
      <View
        style={{
          position: 'absolute',
          left: syncCx + syncR * 0.55,
          top: syncCy - syncR - size * 0.02,
          width: 0,
          height: 0,
          borderLeftWidth: size * 0.05,
          borderRightWidth: size * 0.05,
          borderBottomWidth: size * 0.08,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: cut,
          transform: [{ rotate: '105deg' }],
        }}
      />
      {/* Bottom arrow tip */}
      <View
        style={{
          position: 'absolute',
          left: syncCx - syncR - size * 0.04,
          top: syncCy + syncR * 0.15,
          width: 0,
          height: 0,
          borderLeftWidth: size * 0.05,
          borderRightWidth: size * 0.05,
          borderBottomWidth: size * 0.08,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: cut,
          transform: [{ rotate: '-75deg' }],
        }}
      />
    </View>
  );
}
