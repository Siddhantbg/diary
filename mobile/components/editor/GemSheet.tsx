import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { fonts, radius, spacing } from '@/constants/theme';
import { SheetCloseButton } from '@/components/ui/SheetClose';
import { GemIcon } from '@/components/gems/GemIcon';
import { STICKER_FACES } from '@/lib/stickerFaces';

type Props = {
  visible: boolean;
  /** Currently assigned gem (when cherished). */
  value: string | null;
  onClose: () => void;
  /** Pick a gem to cherish this day, or null to clear. */
  onSelect: (gemId: string | null) => void;
};

/**
 * Star tool → pick a face sticker for this cherished day.
 */
export function GemSheet({ visible, value, onClose, onSelect }: Props) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const rows = [
    STICKER_FACES.slice(0, 5),
    STICKER_FACES.slice(5, 10),
    STICKER_FACES.slice(10, 15),
    STICKER_FACES.slice(15, 20),
  ];

  return (
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
                <Text style={[styles.title, { color: tokens.text }]}>Cherish this day</Text>
                <SheetCloseButton onPress={onClose} />
              </View>
              <Text style={[styles.hint, { color: tokens.textMuted }]}>
                Pick a face for the calendar. Tap again to clear.
              </Text>

              {rows.map((row, ri) => (
                <View key={ri} style={[styles.row, ri > 0 && { marginTop: 10 }]}>
                  {row.map((g) => {
                    const active = value === g.id;
                    return (
                      <Pressable
                        key={g.id}
                        onPress={() => {
                          onSelect(active ? null : g.id);
                          onClose();
                        }}
                        accessibilityLabel={g.name}
                        style={[
                          styles.gemBtn,
                          {
                            borderWidth: active ? 2.5 : StyleSheet.hairlineWidth,
                            borderColor: active ? tokens.accent : tokens.line,
                            backgroundColor: active ? tokens.accentSoft : 'transparent',
                          },
                        ]}
                      >
                        <GemIcon gemId={g.id} size={30} />
                      </Pressable>
                    );
                  })}
                </View>
              ))}

              {value ? (
                <Pressable
                  onPress={() => {
                    onSelect(null);
                    onClose();
                  }}
                  style={styles.clearBtn}
                  hitSlop={8}
                >
                  <Text style={{ color: tokens.textMuted, fontFamily: fonts.body, fontSize: 14 }}>
                    Remove from cherished
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  layer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  anchorWrap: {
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  cardCol: {
    width: '100%',
    maxWidth: 360,
  },
  caretRow: {
    alignItems: 'center',
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
    marginBottom: 4,
    gap: 8,
  },
  title: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 13,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gemBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtn: {
    alignSelf: 'center',
    marginTop: spacing.md,
    paddingVertical: 6,
  },
});
