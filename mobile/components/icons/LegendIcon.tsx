import React from 'react';
import { View } from 'react-native';

type Props = {
  color?: string;
  /** Optional chip colors (up to 3); defaults monochrome dots. */
  chipColors?: [string?, string?, string?];
  variant?: 'dark' | 'light';
  size?: number;
};

/**
 * Map-legend list icon matching assets/legend-{dark|light}-theme.svg
 */
export function LegendIcon({
  color,
  chipColors,
  variant = 'dark',
  size = 22,
}: Props) {
  const stroke = color ?? (variant === 'dark' ? '#FFFFFF' : '#000000');
  const sw = Math.max(1.5, size * 0.08);
  const frame = size * 0.78;
  const left = (size - frame) / 2;
  const top = (size - frame) / 2;
  const r = size * 0.12;
  const chipR = size * 0.08;
  const chipX = left + size * 0.18;
  const lineX = left + size * 0.38;
  const rows = [0.22, 0.5, 0.78].map((t) => top + frame * t);
  const lineWs = [frame * 0.42, frame * 0.42, frame * 0.28];
  const chips = [
    chipColors?.[0] ?? stroke,
    chipColors?.[1] ?? stroke,
    chipColors?.[2] ?? stroke,
  ];

  return (
    <View
      style={{ width: size, height: size }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View
        style={{
          position: 'absolute',
          left,
          top,
          width: frame,
          height: frame,
          borderRadius: r,
          borderWidth: sw,
          borderColor: stroke,
          backgroundColor: 'transparent',
        }}
      />
      {rows.map((y, i) => (
        <React.Fragment key={i}>
          <View
            style={{
              position: 'absolute',
              left: chipX - chipR,
              top: y - chipR,
              width: chipR * 2,
              height: chipR * 2,
              borderRadius: chipR,
              backgroundColor: chips[i],
            }}
          />
          <View
            style={{
              position: 'absolute',
              left: lineX,
              top: y - sw / 2,
              width: lineWs[i],
              height: sw,
              borderRadius: sw,
              backgroundColor: stroke,
            }}
          />
        </React.Fragment>
      ))}
    </View>
  );
}
