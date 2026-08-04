import React from 'react';
import { View } from 'react-native';

type Props = {
  /**
   * Fill color. Defaults from theme: white on dark UIs, black on light UIs.
   * Tab bars may pass accent / muted instead for active state.
   */
  color?: string;
  /** 'dark' → white (for dark themes); 'light' → black (for light themes) */
  variant?: 'dark' | 'light';
  size?: number;
};

/**
 * Profile silhouette matching assets/person-{dark|light}-theme.svg
 * (filled head + shoulders, transparent center gap). Built with Views.
 */
export function PersonIcon({ color, variant = 'dark', size = 22 }: Props) {
  const fill = color ?? (variant === 'dark' ? '#FFFFFF' : '#000000');

  const headSize = size * 0.38;
  const headTop = size * 0.06;
  const bodyTop = size * 0.52;
  const bodyHeight = size * 0.42;
  const bodyWidth = size * 0.78;

  return (
    <View
      style={{ width: size, height: size }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {/* Head */}
      <View
        style={{
          position: 'absolute',
          top: headTop,
          left: (size - headSize) / 2,
          width: headSize,
          height: headSize,
          borderRadius: headSize / 2,
          backgroundColor: fill,
        }}
      />
      {/* Shoulders / torso */}
      <View
        style={{
          position: 'absolute',
          top: bodyTop,
          left: (size - bodyWidth) / 2,
          width: bodyWidth,
          height: bodyHeight,
          backgroundColor: fill,
          borderTopLeftRadius: bodyWidth / 2,
          borderTopRightRadius: bodyWidth / 2,
          borderBottomLeftRadius: size * 0.06,
          borderBottomRightRadius: size * 0.06,
        }}
      />
    </View>
  );
}
