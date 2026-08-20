import React from 'react';
import { Image, ImageStyle, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { moodFaceSource } from '@/lib/moodFaces';

type Props = {
  mood: number | null | undefined;
  size?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
};

/**
 * Custom mood face tile. Assets are already rounded squares —
 * show the full image with contain (no circle crop / cover crop).
 */
export function MoodFace({ mood, size = 40, style, imageStyle }: Props) {
  const radius = Math.round(size * 0.22);
  return (
    <View
      style={[
        styles.wrap,
        { width: size, height: size, borderRadius: radius },
        style,
      ]}
    >
      <Image
        source={moodFaceSource(mood)}
        style={[{ width: size, height: size }, imageStyle]}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
});
