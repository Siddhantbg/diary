import React from 'react';
import { View } from 'react-native';

type Props = {
  color?: string;
  /** 'dark' → white (for dark themes); 'light' → black (for light themes) */
  variant?: 'dark' | 'light';
  size?: number;
};

/**
 * Price-tag outline matching assets/tag-{dark|light}-theme.svg
 * (tilted body + eyelet). Built with Views — no react-native-svg.
 */
export function TagIcon({ color, variant = 'dark', size = 22 }: Props) {
  const strokeColor = color ?? (variant === 'dark' ? '#FFFFFF' : '#000000');
  const stroke = Math.max(1.5, size * 0.085);

  // Axis-aligned proportions, then whole group rotated −40°
  const bodyW = size * 0.78;
  const bodyH = size * 0.42;
  const hole = size * 0.15;
  const tip = bodyH * 0.48;

  return (
    <View
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View
        style={{
          width: bodyW,
          height: bodyH,
          transform: [{ rotate: '-40deg' }],
        }}
      >
        {/* Main rounded body (right side of tag) */}
        <View
          style={{
            position: 'absolute',
            left: tip * 0.55,
            top: 0,
            right: 0,
            bottom: 0,
            borderWidth: stroke,
            borderColor: strokeColor,
            borderRadius: bodyH * 0.32,
            backgroundColor: 'transparent',
          }}
        />
        {/* Pointed left tip (diamond) */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: (bodyH - tip * 1.15) / 2,
            width: tip * 1.15,
            height: tip * 1.15,
            borderWidth: stroke,
            borderColor: strokeColor,
            backgroundColor: 'transparent',
            transform: [{ rotate: '45deg' }],
            borderRadius: stroke,
          }}
        />
        {/* Eyelet hole */}
        <View
          style={{
            position: 'absolute',
            left: tip * 0.72,
            top: (bodyH - hole) / 2,
            width: hole,
            height: hole,
            borderRadius: hole / 2,
            borderWidth: stroke,
            borderColor: strokeColor,
            backgroundColor: 'transparent',
          }}
        />
      </View>
    </View>
  );
}
