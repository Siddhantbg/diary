import React from 'react';
import { View } from 'react-native';

type Props = {
  color?: string;
  /** Paint wells / thumb hole — match parent background. */
  cutoutColor?: string;
  variant?: 'dark' | 'light';
  size?: number;
};

/**
 * Paint palette matching assets/theme-{dark|light}-theme.svg
 */
export function ThemeIcon({
  color,
  cutoutColor = 'transparent',
  variant = 'dark',
  size = 22,
}: Props) {
  const fill = color ?? (variant === 'dark' ? '#FFFFFF' : '#000000');
  const cut = cutoutColor;

  const well = (cx: number, cy: number, r: number) => (
    <View
      key={`${cx}-${cy}-${r}`}
      style={{
        position: 'absolute',
        left: cx - r,
        top: cy - r,
        width: r * 2,
        height: r * 2,
        borderRadius: r,
        backgroundColor: cut,
      }}
    />
  );

  return (
    <View
      style={{ width: size, height: size }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {/* Main kidney / oval body */}
      <View
        style={{
          position: 'absolute',
          left: size * 0.08,
          top: size * 0.08,
          width: size * 0.84,
          height: size * 0.8,
          borderRadius: size * 0.42,
          backgroundColor: fill,
        }}
      />
      {/* Lower-right mass */}
      <View
        style={{
          position: 'absolute',
          left: size * 0.38,
          top: size * 0.4,
          width: size * 0.52,
          height: size * 0.44,
          borderTopLeftRadius: size * 0.2,
          borderTopRightRadius: size * 0.28,
          borderBottomLeftRadius: size * 0.28,
          borderBottomRightRadius: size * 0.22,
          backgroundColor: fill,
        }}
      />

      {/* Thumb hole (bottom-right edge) */}
      {well(size * 0.42, size * 0.82, size * 0.12)}

      {/* Paint wells along top arc (left → top → right) */}
      {well(size * 0.28, size * 0.36, size * 0.07)}
      {well(size * 0.44, size * 0.24, size * 0.085)}
      {well(size * 0.62, size * 0.28, size * 0.09)}
      {well(size * 0.76, size * 0.42, size * 0.075)}
    </View>
  );
}
