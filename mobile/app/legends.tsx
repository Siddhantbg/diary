import React, { useCallback, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { fonts, radius, spacing } from '@/constants/theme';
import { ActionSheet, SheetAction } from '@/components/ui/ActionSheet';
import { LegendIcon } from '@/components/icons/LegendIcon';
import { GemIcon } from '@/components/gems/GemIcon';
import { GEMS, gemById } from '@/lib/gems';
import { STICKER_FACES } from '@/lib/stickerFaces';
import {
  addLegend,
  defaultLegends,
  deleteLegend,
  DiaryLegend,
  LEGEND_COLOR_PRESETS,
  loadLegends,
  updateLegend,
} from '@/lib/legends';

/**
 * Manage calendar legends: name, color, and gem mapping
 * (Entry / Cherished + custom).
 */
export default function LegendsScreen() {
  const { tokens, isDark } = useTheme();
  const [legends, setLegends] = useState<DiaryLegend[]>(defaultLegends());
  const [editor, setEditor] = useState<{
    mode: 'add' | 'edit';
    id?: string;
    name: string;
    color: string;
    gemId: string | null;
  } | null>(null);
  const [sheet, setSheet] = useState<{
    title: string;
    message?: string;
    actions: SheetAction[];
  } | null>(null);

  const editingSystem = editor?.mode === 'edit'
    ? legends.find((x) => x.id === editor.id)?.system
    : undefined;
  const iconCatalog = editingSystem ? STICKER_FACES : GEMS;

  const reload = useCallback(async () => {
    setLegends(await loadLegends());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  const notice = (title: string, message: string) =>
    setSheet({
      title,
      message,
      actions: [{ key: 'ok', label: 'Got it', icon: '✓', onPress: () => undefined }],
    });

  const openAdd = () => {
    const gem = GEMS[Math.floor(Math.random() * GEMS.length)];
    setEditor({
      mode: 'add',
      name: '',
      color: gem.tint,
      gemId: gem.id,
    });
  };

  const openEdit = (l: DiaryLegend) =>
    setEditor({
      mode: 'edit',
      id: l.id,
      name: l.name,
      color: l.color,
      gemId: l.gemId || null,
    });

  const pickGem = (gemId: string) => {
    setEditor((e) => (e ? { ...e, gemId } : e));
  };

  const saveEditor = async () => {
    if (!editor) return;
    const name = editor.name.trim();
    if (!name) {
      notice('Name required', 'Give this legend a short label.');
      return;
    }
    if (editor.mode === 'add') {
      await addLegend(name, editor.color, editor.gemId);
    } else if (editor.id) {
      await updateLegend(editor.id, {
        name,
        color: editor.color,
        gemId: editor.gemId,
      });
    }
    setEditor(null);
    await reload();
  };

  const confirmDelete = (l: DiaryLegend) => {
    if (l.system) return;
    setSheet({
      title: `Delete “${l.name}”?`,
      message: 'Days using this legend keep their data; the key is removed from the list.',
      actions: [
        {
          key: 'del',
          label: 'Delete',
          icon: '⌫',
          destructive: true,
          onPress: () => {
            void deleteLegend(l.id).then(reload);
          },
        },
        {
          key: 'cancel',
          label: 'Cancel',
          icon: '✕',
          cancel: true,
          onPress: () => undefined,
        },
      ],
    });
  };

  return (
    <View style={[styles.screen, { backgroundColor: tokens.bg }]}>
      <Stack.Screen
        options={{
          title: 'Legends',
          headerBackTitle: 'Back',
          headerRight: () => (
            <Pressable onPress={openAdd} hitSlop={12} accessibilityLabel="Add legend">
              <Text style={{ color: tokens.accent, fontFamily: fonts.bodyMedium, fontSize: 22 }}>
                +
              </Text>
            </Pressable>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <LegendIcon
            color={tokens.accent}
            variant={isDark ? 'dark' : 'light'}
            chipColors={['#4A90E2', '#FFC857', '#5BC57A']}
            size={40}
          />
          <Text style={[styles.heroSub, { color: tokens.textMuted }]}>
            Map a face for Entry / Cherished, or a gem for a custom legend. Color tints the label text.
          </Text>
        </View>

        {legends.map((l) => (
          <Pressable
            key={l.id}
            onPress={() => openEdit(l)}
            onLongPress={() => confirmDelete(l)}
            style={[styles.row, { borderBottomColor: tokens.line }]}
          >
            {l.gemId ? (
              <GemIcon gemId={l.gemId} size={32} />
            ) : (
              <View
                style={[styles.swatch, { backgroundColor: l.color, borderColor: tokens.line }]}
              />
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: l.color }]}>{l.name}</Text>
              <Text style={[styles.rowSub, { color: tokens.textMuted }]}>
                {l.system === 'entry'
                  ? 'Default diary days'
                  : l.system === 'cherished'
                    ? 'Cherished entries'
                    : 'Custom · tap to edit'}
                {l.gemId ? ` · ${gemById(l.gemId)?.name ?? 'Gem'}` : ''}
              </Text>
            </View>
            <Text style={{ color: tokens.textSubtle, fontSize: 18 }}>›</Text>
          </Pressable>
        ))}

        <Pressable
          onPress={openAdd}
          style={[styles.addBtn, { backgroundColor: tokens.accent }]}
        >
          <Text style={styles.addBtnText}>+ Add legend</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={!!editor} transparent animationType="fade" onRequestClose={() => setEditor(null)}>
        <Pressable style={styles.dim} onPress={() => setEditor(null)}>
          <View
            style={[styles.sheet, { backgroundColor: tokens.bgElevated, borderColor: tokens.line }]}
            onStartShouldSetResponder={() => true}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.sheetHeader}>
                <Text style={[styles.sheetTitle, { color: tokens.text }]}>
                  {editor?.mode === 'add' ? 'New legend' : 'Edit legend'}
                </Text>
                <View style={styles.sheetHeaderActions}>
                  {editor?.mode === 'edit' &&
                  editor.id &&
                  !legends.find((x) => x.id === editor.id)?.system ? (
                    <Pressable
                      onPress={() => {
                        const id = editor.id!;
                        setEditor(null);
                        confirmDelete({
                          id,
                          name: editor.name,
                          color: editor.color,
                          gemId: editor.gemId,
                        });
                      }}
                      hitSlop={8}
                      accessibilityLabel="Delete legend"
                    >
                      <Ionicons name="trash-outline" size={20} color={tokens.danger} />
                    </Pressable>
                  ) : null}
                  <Pressable onPress={() => setEditor(null)} hitSlop={8}>
                    <Text style={{ color: tokens.textMuted, fontFamily: fonts.body, fontSize: 16 }}>
                      Cancel
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => void saveEditor()} hitSlop={8}>
                    <Text style={{ color: tokens.accent, fontFamily: fonts.bodyMedium, fontSize: 16 }}>
                      Save
                    </Text>
                  </Pressable>
                </View>
              </View>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: editor?.color || tokens.text,
                    borderBottomColor: tokens.line,
                  },
                ]}
                value={editor?.name ?? ''}
                onChangeText={(name) => setEditor((e) => (e ? { ...e, name } : e))}
                placeholder="Label (e.g. Travel, Family)"
                placeholderTextColor={tokens.textSubtle}
                maxLength={40}
              />

              <Text style={[styles.colorLabel, { color: tokens.textMuted }]}>
                {editingSystem ? 'Face' : 'Gem'}
              </Text>
              <View style={styles.gemGrid}>
                {iconCatalog.map((g) => {
                  const on = editor?.gemId === g.id;
                  return (
                    <Pressable
                      key={g.id}
                      onPress={() => pickGem(g.id)}
                      style={[
                        styles.gemCell,
                        {
                          borderColor: on ? tokens.accent : tokens.line,
                          borderWidth: on ? 2 : StyleSheet.hairlineWidth,
                          backgroundColor: on ? tokens.bgCard : 'transparent',
                        },
                      ]}
                      accessibilityLabel={g.name}
                    >
                      <GemIcon gemId={g.id} size={36} />
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.colorLabel, { color: tokens.textMuted }]}>Text color</Text>
              <View style={styles.palette}>
                {LEGEND_COLOR_PRESETS.map((c) => {
                  const on = editor?.color === c;
                  return (
                    <Pressable
                      key={c}
                      onPress={() => setEditor((e) => (e ? { ...e, color: c } : e))}
                      style={[
                        styles.colorDot,
                        {
                          backgroundColor: c,
                          borderColor: on ? tokens.accent : tokens.line,
                          borderWidth: on ? 3 : StyleSheet.hairlineWidth,
                        },
                      ]}
                    />
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      <ActionSheet
        visible={!!sheet}
        title={sheet?.title ?? ''}
        message={sheet?.message}
        actions={sheet?.actions ?? []}
        onClose={() => setSheet(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingBottom: 48 },
  hero: { alignItems: 'center', paddingVertical: spacing.lg, gap: 12 },
  heroSub: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  miniSwatch: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rowTitle: { fontFamily: fonts.body, fontSize: 16 },
  rowSub: { fontFamily: fonts.body, fontSize: 12, marginTop: 2 },
  addBtn: {
    marginTop: spacing.xl,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addBtnText: {
    color: '#FFFFFF',
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
  },
  dim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    maxHeight: '88%',
  },
  sheetTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    flex: 1,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: spacing.md,
  },
  sheetHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  input: {
    fontFamily: fonts.body,
    fontSize: 16,
    borderBottomWidth: 1,
    paddingVertical: 10,
    marginBottom: spacing.md,
  },
  colorLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
    marginBottom: 8,
  },
  gemGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.md,
  },
  gemCell: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  palette: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: spacing.md,
  },
  colorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
});
