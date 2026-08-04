import React from 'react';
import { Image, StyleSheet, Text, View, type TextStyle, type StyleProp } from 'react-native';
import { fonts } from '@/constants/theme';

const DIARY = require('../../assets/images/diary-brand.png');

type MarkProps = {
  size?: number;
};

/** Transparent diary brand art (replaces book/diary emoji). */
export function DiaryMark({ size = 28 }: MarkProps) {
  // Source art is nearly square (~488×512)
  const width = size * (488 / 512);
  return (
    <Image
      source={DIARY}
      style={{ width, height: size }}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
    />
  );
}

type TitleProps = {
  color: string;
  fontSize?: number;
  markSize?: number;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
};

/** Diary mark + “MyDiary” wordmark for headers, lock screen, drawer. */
export function MyDiaryTitle({
  color,
  fontSize = 22,
  markSize = 28,
  style,
  numberOfLines = 1,
}: TitleProps) {
  return (
    <View style={styles.row} accessibilityRole="header" accessibilityLabel="MyDiary">
      <DiaryMark size={markSize} />
      <Text
        style={[styles.title, { color, fontSize }, style]}
        numberOfLines={numberOfLines}
      >
        MyDiary
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontFamily: fonts.display,
    flexShrink: 1,
  },
});
