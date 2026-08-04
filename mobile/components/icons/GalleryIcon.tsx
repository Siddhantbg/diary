import React from 'react';
import { View } from 'react-native';

type Props = {
  /**
   * Stroke color. Defaults from theme: white on dark UIs, black on light UIs.
   * Tab rows / sheets may pass `tokens.text` for tonal match.
   */
  color?: string;
  /** 'dark' → white (for dark themes); 'light' → black (for light themes) */
  variant?: 'dark' | 'light';
  size?: number;
};

/** Scale points from a 512 viewBox into icon pixels. */
function u(size: number, n: number) {
  return (n / 512) * size;
}

function Segment({
  x1,
  y1,
  x2,
  y2,
  color,
  stroke,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  stroke: number;
}) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;

  return (
    <View
      style={{
        position: 'absolute',
        left: cx - len / 2,
        top: cy - stroke / 2,
        width: len,
        height: stroke,
        borderRadius: stroke / 2,
        backgroundColor: color,
        transform: [{ rotate: `${angle}deg` }],
      }}
    />
  );
}

/**
 * Stacked gallery frames matching assets/gallery-{dark|light}-theme.svg
 * (rear frame + landscape front). Built with Views — no react-native-svg.
 */
export function GalleryIcon({ color, variant = 'dark', size = 22 }: Props) {
  const strokeColor = color ?? (variant === 'dark' ? '#FFFFFF' : '#000000');
  const stroke = Math.max(1.4, size * (36 / 512));

  // Front frame (512 coords)
  const f = { x: 68, y: 152, w: 292, h: 292, r: 42 };
  // Back frame
  const b = { x: 152, y: 52, w: 292, h: 292, r: 42 };
  // Sun
  const sunR = 30;
  // Mountain polyline in 512-space
  const mountains: [number, number][] = [
    [100, 372],
    [178, 268],
    [238, 340],
    [318, 222],
    [360, 372],
  ];

  return (
    <View
      style={{ width: size, height: size }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {/* Back frame */}
      <View
        style={{
          position: 'absolute',
          left: u(size, b.x),
          top: u(size, b.y),
          width: u(size, b.w),
          height: u(size, b.h),
          borderRadius: u(size, b.r),
          borderWidth: stroke,
          borderColor: strokeColor,
          backgroundColor: 'transparent',
        }}
      />
      {/* Front frame */}
      <View
        style={{
          position: 'absolute',
          left: u(size, f.x),
          top: u(size, f.y),
          width: u(size, f.w),
          height: u(size, f.h),
          borderRadius: u(size, f.r),
          borderWidth: stroke,
          borderColor: strokeColor,
          backgroundColor: 'transparent',
        }}
      />
      {/* Sun / moon */}
      <View
        style={{
          position: 'absolute',
          left: u(size, 214 - sunR),
          top: u(size, 248 - sunR),
          width: u(size, sunR * 2),
          height: u(size, sunR * 2),
          borderRadius: u(size, sunR),
          borderWidth: stroke,
          borderColor: strokeColor,
          backgroundColor: 'transparent',
        }}
      />
      {/* Mountains */}
      {mountains.slice(0, -1).map((p, i) => {
        const n = mountains[i + 1];
        return (
          <Segment
            key={i}
            x1={u(size, p[0])}
            y1={u(size, p[1])}
            x2={u(size, n[0])}
            y2={u(size, n[1])}
            color={strokeColor}
            stroke={stroke}
          />
        );
      })}
    </View>
  );
}
