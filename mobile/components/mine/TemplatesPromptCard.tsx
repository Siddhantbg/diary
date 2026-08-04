import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts, spacing } from '@/constants/theme';

const GIRL = require('../../assets/images/templates-girl.png');
const BUBBLE = require('../../assets/images/templates-thought-bubble.png');

type Props = {
  onStart: () => void;
};

/**
 * Templates CTA — girl anchored bottom · bubble above head · START beside her (light overlay OK).
 */
export function TemplatesPromptCard({ onStart }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.left}>
        <Text style={styles.title}>{"No idea what\nto write?"}</Text>
        <View style={styles.bodyRow}>
          <Text style={styles.bulb}>💡</Text>
          <Text style={styles.body}>
            Take it easy. Apply Diary Templates to finish your entry.
          </Text>
        </View>
      </View>

      <View style={styles.right}>
        <Image source={BUBBLE} style={styles.bubble} resizeMode="contain" />
        <Image source={GIRL} style={styles.girl} resizeMode="contain" />
        <Pressable
          onPress={onStart}
          accessibilityRole="button"
          accessibilityLabel="Start diary templates"
          style={({ pressed }) => [
            styles.startBtn,
            { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
          ]}
        >
          <Text style={styles.startLabel}>START</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: '#15203B',
    borderRadius: 22,
    overflow: 'hidden',
    minHeight: 168,
    marginBottom: spacing.md,
    paddingLeft: 16,
  },
  left: {
    flexGrow: 42,
    flexShrink: 1,
    flexBasis: 0,
    paddingVertical: 18,
    paddingRight: 4,
    justifyContent: 'center',
    gap: 10,
    zIndex: 1,
  },
  title: {
    fontFamily: fonts.bodyMedium,
    fontSize: 19,
    lineHeight: 25,
    color: '#FFFFFF',
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  bulb: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 1,
  },
  body: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 12.5,
    lineHeight: 18,
    color: '#8A99AF',
  },
  right: {
    flexGrow: 58,
    flexShrink: 1,
    flexBasis: 0,
    position: 'relative',
    minHeight: 168,
    overflow: 'hidden',
  },
  bubble: {
    position: 'absolute',
    top: 6,
    right: 14,
    width: 58,
    height: 50,
    zIndex: 2,
  },
  // Explicit width+height — left/right alone can collapse Image to 0 on RN
  girl: {
    position: 'absolute',
    left: 4,
    bottom: 0,
    width: '78%',
    height: 142,
    zIndex: 1,
  },
  startBtn: {
    position: 'absolute',
    right: 10,
    bottom: 14,
    backgroundColor: '#5B8AD3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    zIndex: 3,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  startLabel: {
    color: '#FFFFFF',
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    letterSpacing: 1.3,
  },
});
