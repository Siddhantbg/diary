import React, { useId } from 'react';
import Svg, {
  Defs,
  Ellipse,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';

type Props = {
  size?: number;
};

/**
 * Gradient flat-vector back control (rounded plate + glossy chevron).
 */
export function BackIcon({ size = 32 }: Props) {
  const uid = useId().replace(/:/g, '');
  const plate = `backPlate-${uid}`;
  const gloss = `backGloss-${uid}`;
  const chevron = `backChevron-${uid}`;

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Defs>
        <LinearGradient id={plate} x1="12" y1="6" x2="54" y2="58">
          <Stop offset="0" stopColor="#9BE2F7" />
          <Stop offset="0.48" stopColor="#5BA8EA" />
          <Stop offset="1" stopColor="#3A6FDB" />
        </LinearGradient>
        <LinearGradient id={gloss} x1="18" y1="8" x2="40" y2="28">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.55} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </LinearGradient>
        <LinearGradient id={chevron} x1="24" y1="16" x2="40" y2="48">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#E4F3FF" />
        </LinearGradient>
      </Defs>

      <Ellipse cx="32" cy="56.5" rx="15" ry="3.4" fill="#0B1A33" opacity={0.28} />
      <Rect x="6" y="5" width="52" height="52" rx="16" fill={`url(#${plate})`} />
      <Rect x="8.5" y="7.5" width="47" height="22" rx="12" fill={`url(#${gloss})`} />
      <Path
        d="M37.5 18.5L24 32l13.5 13.5"
        stroke="#1E4B8A"
        strokeWidth={7.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.28}
        fill="none"
      />
      <Path
        d="M36.2 17.2L22.7 30.7l13.5 13.5"
        stroke={`url(#${chevron})`}
        strokeWidth={6.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
