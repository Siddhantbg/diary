import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { fonts } from '@/constants/theme';

type CloseProps = {
  onPress: () => void;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

/** Top-right ✕ control for sheets / modals. */
export function SheetCloseButton({ onPress, color, style }: CloseProps) {
  const { tokens } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      accessibilityLabel="Close"
      accessibilityRole="button"
      style={[styles.closeBtn, style]}
    >
      <Text style={[styles.closeGlyph, { color: color ?? tokens.textMuted }]}>✕</Text>
    </Pressable>
  );
}

type HeaderProps = {
  title: string;
  onClose: () => void;
  /** Optional control to the left of the close button (e.g. Done). */
  trailing?: React.ReactNode;
  titleColor?: string;
  style?: StyleProp<ViewStyle>;
};

/** Title + optional trailing action + top-right close. */
export function SheetHeader({ title, onClose, trailing, titleColor, style }: HeaderProps) {
  const { tokens } = useTheme();
  return (
    <View style={[styles.header, style]}>
      <Text
        style={[styles.title, { color: titleColor ?? tokens.text }]}
        numberOfLines={1}
      >
        {title}
      </Text>
      <View style={styles.actions}>
        {trailing}
        <SheetCloseButton onPress={onClose} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeGlyph: {
    fontFamily: fonts.bodyMedium,
    fontSize: 18,
    lineHeight: 20,
    marginTop: -1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  title: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 17,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
