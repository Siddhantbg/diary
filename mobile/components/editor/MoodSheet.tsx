import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { fonts, radius, spacing } from '@/constants/theme';
import { SheetCloseButton } from '@/components/ui/SheetClose';
import { ActionSheet } from '@/components/ui/ActionSheet';
import {
  MOOD_COLORS,
  MOOD_EMOJIS,
  MOOD_IDS,
  MOOD_LABELS,
} from '@/lib/dates';

type Props = {
  visible: boolean;
  value: number | null;
  onClose: () => void;
  onSelect: (mood: number | null) => void;
};

/**
 * Popover “How's your day?” — 2×5 colorful emoji circles + caret
 * (matches mood picker design reference).
 */
export function MoodSheet({ visible, value, onClose, onSelect }: Props) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.layer}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
          <View
            pointerEvents="box-none"
            style={[styles.anchorWrap, { paddingTop: insets.top + 96 }]}
          >
            <View style={styles.cardCol}>
              <View style={styles.caretRow}>
                <View style={[styles.caret, { borderBottomColor: tokens.bgElevated }]} />
              </View>

              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: tokens.bgElevated,
                    borderColor: tokens.line,
                  },
                ]}
              >
                <View style={styles.header}>
                  <Text style={[styles.title, { color: tokens.text }]}>{"How's your day?"}</Text>
                  <View style={styles.headerRight}>
                    <Pressable onPress={() => setMoreOpen(true)} hitSlop={8}>
                      <Text style={[styles.more, { color: tokens.textMuted }]}>MORE</Text>
                    </Pressable>
                    <SheetCloseButton onPress={onClose} />
                  </View>
                </View>

                <View style={styles.row}>
                  {MOOD_IDS.slice(0, 5).map((n) => (
                    <MoodDot
                      key={n}
                      n={n}
                      active={value === n}
                      onPress={() => {
                        onSelect(value === n ? null : n);
                        onClose();
                      }}
                    />
                  ))}
                </View>

                <View style={[styles.row, { marginTop: 12 }]}>
                  {MOOD_IDS.slice(5, 10).map((n) => (
                    <MoodDot
                      key={n}
                      n={n}
                      active={value === n}
                      onPress={() => {
                        onSelect(value === n ? null : n);
                        onClose();
                      }}
                    />
                  ))}
                </View>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <ActionSheet
        visible={moreOpen}
        title="Mood styles"
        message="More mood packs and custom faces are on the roadmap for a future update."
        onClose={() => setMoreOpen(false)}
        actions={[
          { key: 'ok', label: 'Sounds good', icon: '✓', onPress: () => undefined },
        ]}
      />
    </>
  );
}

function MoodDot({
  n,
  active,
  onPress,
}: {
  n: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={MOOD_LABELS[n]}
      style={[
        styles.emojiBtn,
        {
          backgroundColor: MOOD_COLORS[n],
          borderWidth: active ? 2.5 : 0,
          borderColor: '#FFFFFF',
          transform: [{ scale: active ? 1.06 : 1 }],
        },
      ]}
    >
      <Text style={styles.emoji}>{MOOD_EMOJIS[n]}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  layer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  anchorWrap: {
    paddingHorizontal: spacing.lg,
    alignItems: 'flex-end',
  },
  cardCol: {
    width: '92%',
    maxWidth: 340,
  },
  caretRow: {
    alignItems: 'flex-end',
    paddingRight: 20,
    marginBottom: -1,
    zIndex: 2,
  },
  caret: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md + 4,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  title: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
  },
  more: {
    fontFamily: fonts.body,
    fontSize: 12,
    letterSpacing: 0.6,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  emojiBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 26,
  },
});
