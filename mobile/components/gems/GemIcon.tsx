import React from 'react';
import { Image, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { gemById, gemSource } from '@/lib/gems';

type Props = {
  gemId?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

/** Renders a mapped diary gem (transparent PNG). */
export function GemIcon({ gemId, size = 28, style }: Props) {
  const source = gemSource(gemId);
  if (!source) return null;
  const gem = gemById(gemId);
  return (
    <View style={[styles.wrap, { width: size, height: size }, style]}>
      <Image
        source={source}
        style={{ width: size, height: size }}
        resizeMode="contain"
        accessibilityLabel={gem?.name ?? 'Marker'}
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
