import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { fonts, radius, spacing } from '@/constants/theme';
import { SheetHeader } from '@/components/ui/SheetClose';

export type SheetAction = {
  key: string;
  label: string;
  /** Optional leading glyph or custom node (e.g. GalleryIcon) */
  icon?: React.ReactNode;
  /** Red emphasis (delete, discard) */
  destructive?: boolean;
  /** Muted / secondary look */
  cancel?: boolean;
  onPress: () => void;
};

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  actions: SheetAction[];
  onClose: () => void;
};

/**
 * Themed bottom sheet for menus & choices (replaces system Alert.alert).
 * Follows light/dark app tokens. ✕ top-right; backdrop dismiss.
 */
export function ActionSheet({ visible, title, message, actions, onClose }: Props) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.dim} onPress={onClose} accessibilityLabel="Dismiss" />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: tokens.bgElevated,
              borderColor: tokens.line,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: tokens.line }]} />
          <SheetHeader title={title} onClose={onClose} style={styles.header} />
          {message ? (
            <Text style={[styles.message, { color: tokens.textMuted }]}>{message}</Text>
          ) : null}

          <View
            style={[
              styles.list,
              {
                backgroundColor: tokens.bgCard,
                borderColor: tokens.line,
              },
            ]}
          >
            {actions.map((a, i) => {
              const color = a.destructive
                ? tokens.danger
                : a.cancel
                  ? tokens.textMuted
                  : tokens.text;
              return (
                <React.Fragment key={a.key}>
                  {i > 0 ? (
                    <View style={[styles.divider, { backgroundColor: tokens.line }]} />
                  ) : null}
                  <Pressable
                    onPress={() => {
                      onClose();
                      // Defer so close animation can start before action side-effects
                      requestAnimationFrame(() => a.onPress());
                    }}
                    style={({ pressed }) => [
                      styles.row,
                      { opacity: pressed ? 0.65 : 1 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={a.label}
                  >
                    {a.icon != null && a.icon !== '' ? (
                      typeof a.icon === 'string' || typeof a.icon === 'number' ? (
                        <Text style={[styles.icon, { color }]}>{a.icon}</Text>
                      ) : (
                        <View style={styles.iconNode}>{a.icon}</View>
                      )
                    ) : (
                      <View style={styles.iconPlaceholder} />
                    )}
                    <Text
                      style={[
                        styles.rowLabel,
                        {
                          color,
                          fontFamily: a.destructive || a.cancel ? fonts.bodyMedium : fonts.body,
                        },
                      ]}
                    >
                      {a.label}
                    </Text>
                    <Text style={[styles.chev, { color: tokens.textSubtle }]}>›</Text>
                  </Pressable>
                </React.Fragment>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    zIndex: 2,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: spacing.sm,
    opacity: 0.7,
  },
  header: {
    marginBottom: spacing.sm,
  },
  message: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.md,
    paddingHorizontal: 2,
  },
  list: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: spacing.md,
    gap: 12,
    minHeight: 52,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.md + 28 + 12,
  },
  icon: {
    width: 28,
    fontSize: 18,
    textAlign: 'center',
  },
  iconNode: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPlaceholder: {
    width: 28,
  },
  rowLabel: {
    flex: 1,
    fontSize: 16,
  },
  chev: {
    fontSize: 20,
    fontFamily: fonts.body,
    marginTop: -1,
  },
});
