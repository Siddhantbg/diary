import React from 'react';
import { View } from 'react-native';

type Props = {
  /** 'dark' → white outline (for dark themes); 'light' → black outline */
  variant: 'dark' | 'light';
  size?: number;
};

/**
 * Outline mic matching assets/microphone-{dark|light}-theme.svg
 * (hollow capsule). Built with Views — no react-native-svg.
 */
export function MicIcon({ variant, size = 22 }: Props) {
  const color = variant === 'dark' ? '#FFFFFF' : '#000000';
  const stroke = Math.max(1.5, size * 0.09);
  const w = size;
  const h = size;

  // Proportions tuned to the SVG viewBox geometry
  const capsuleW = w * 0.28;
  const capsuleH = h * 0.48;
  const capsuleTop = h * 0.08;
  const capsuleLeft = (w - capsuleW) / 2;
  const cradleTop = h * 0.38;
  const cradleH = h * 0.36;
  const cradleW = w * 0.58;
  const cradleLeft = (w - cradleW) / 2;
  const stemTop = cradleTop + cradleH - stroke / 2;
  const stemH = h * 0.12;
  const baseTop = stemTop + stemH;
  const baseW = w * 0.38;

  return (
    <View style={{ width: w, height: h }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {/* Hollow capsule */}
      <View
        style={{
          position: 'absolute',
          left: capsuleLeft,
          top: capsuleTop,
          width: capsuleW,
          height: capsuleH,
          borderRadius: capsuleW / 2,
          borderWidth: stroke,
          borderColor: color,
          backgroundColor: 'transparent',
        }}
      />
      {/* U cradle — bottom arc + side walls via border */}
      <View
        style={{
          position: 'absolute',
          left: cradleLeft,
          top: cradleTop,
          width: cradleW,
          height: cradleH,
          borderBottomLeftRadius: cradleW / 2,
          borderBottomRightRadius: cradleW / 2,
          borderLeftWidth: stroke,
          borderRightWidth: stroke,
          borderBottomWidth: stroke,
          borderTopWidth: 0,
          borderColor: color,
          backgroundColor: 'transparent',
        }}
      />
      {/* Stem */}
      <View
        style={{
          position: 'absolute',
          left: (w - stroke) / 2,
          top: stemTop,
          width: stroke,
          height: stemH,
          borderRadius: stroke / 2,
          backgroundColor: color,
        }}
      />
      {/* Base */}
      <View
        style={{
          position: 'absolute',
          left: (w - baseW) / 2,
          top: baseTop,
          width: baseW,
          height: stroke,
          borderRadius: stroke / 2,
          backgroundColor: color,
        }}
      />
    </View>
  );
}
