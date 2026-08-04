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
import { Stack, useFocusEffect } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { fonts, radius, spacing } from '@/constants/theme';
import { ActionSheet, SheetAction } from '@/components/ui/ActionSheet';
import { LegendIcon } from '@/components/icons/LegendIcon';
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
 * Manage calendar legend labels & colors (Entry / Cherished + custom).
 */
export default function LegendsScreen() {
  const { tokens, isDark } = useTheme();
  const [legends, setLegends] = useState<DiaryLegend[]>(defaultLegends());
  const [editor, setEditor] = useState<{
    mode: 'add' | 'edit';
    id?: string;
    name: string;
    color: string;
  } | null>(null);
  const [sheet, setSheet] = useState<{
    title: string;
    message?: string;
    actions: SheetAction[];
  } | null>(null);

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

  const openAdd = () =>
    setEditor({
      mode: 'add',
      name: '',
      color: LEGEND_COLOR_PRESETS[Math.floor(Math.random() * 6)],
    });

  const openEdit = (l: DiaryLegend) =>
    setEditor({ mode: 'edit', id: l.id, name: l.name, color: l.color });

  const saveEditor = async () => {
    if (!editor) return;
    const name = editor.name.trim();
    if (!name) {
      notice('Name required', 'Give this legend a short label.');
      return;
    }
    if (editor.mode === 'add') {
      await addLegend(name, editor.color);
    } else if (editor.id) {
      await updateLegend(editor.id, { name, color: editor.color });
    }
    setEditor(null);
    await reload();
  };

  const confirmDelete = (l: DiaryLegend) => {
    if (l.system) return;
    setSheet({
      title: `Delete “${l.name}”?`,
      message: 'Days using this legend keep their data; the color key is removed from the list.',
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
              <Text style={{ color: tokens.accent, fontFamily: fonts.bodyMedium, fontSize: 22 }}>+</Text>
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
            Calendar dots use these colors. Entry and Cherished are built in — customize their
            colors, or add your own and apply them from the day editor (legend tool).
          </Text>
        </View>

        {legends.map((l) => (
          <Pressable
            key={l.id}
            onPress={() => openEdit(l)}
            onLongPress={() => confirmDelete(l)}
            style={[styles.row, { borderBottomColor: tokens.line }]}
          >
            <View style={[styles.swatch, { backgroundColor: l.color, borderColor: tokens.line }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: tokens.text }]}>{l.name}</Text>
              <Text style={[styles.rowSub, { color: tokens.textMuted }]}>
                {l.system === 'entry'
                  ? 'Default for diary days'
                  : l.system === 'cherished'
                    ? 'When marked cherished ★'
                    : 'Custom · tap to edit'}
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
            <Text style={[styles.sheetTitle, { color: tokens.text }]}>
              {editor?.mode === 'add' ? 'New legend' : 'Edit legend'}
            </Text>
            <TextInput
              style={[styles.input, { color: tokens.text, borderBottomColor: tokens.line }]}
              value={editor?.name ?? ''}
              onChangeText={(name) => setEditor((e) => (e ? { ...e, name } : e))}
              placeholder="Label"
              placeholderTextColor={tokens.textSubtle}
              maxLength={40}
            />
            <Text style={[styles.colorLabel, { color: tokens.textMuted }]}>Color</Text>
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
            <TextInput
              style={[styles.input, { color: tokens.text, borderBottomColor: tokens.line }]}
              value={editor?.color ?? ''}
              onChangeText={(color) => setEditor((e) => (e ? { ...e, color } : e))}
              placeholder="#RRGGBB"
              placeholderTextColor={tokens.textSubtle}
              autoCapitalize="characters"
            />
            <View style={styles.sheetActions}>
              {editor?.mode === 'edit' &&
              editor.id &&
              !legends.find((x) => x.id === editor.id)?.system ? (
                <Pressable
                  onPress={() => {
                    const id = editor.id!;
                    setEditor(null);
                    confirmDelete({ id, name: editor.name, color: editor.color });
                  }}
                >
                  <Text style={{ color: tokens.danger, fontFamily: fonts.body }}>Delete</Text>
                </Pressable>
              ) : (
                <View />
              )}
              <View style={{ flexDirection: 'row', gap: 24 }}>
                <Pressable onPress={() => setEditor(null)}>
                  <Text style={{ color: tokens.textMuted, fontFamily: fonts.body }}>Cancel</Text>
                </Pressable>
                <Pressable onPress={() => void saveEditor()}>
                  <Text style={{ color: tokens.accent, fontFamily: fonts.bodyMedium }}>Save</Text>
                </Pressable>
              </View>
            </View>
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
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
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
  },
  sheetTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    marginBottom: spacing.md,
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
  sheetActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
});
