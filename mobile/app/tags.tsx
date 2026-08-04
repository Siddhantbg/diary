import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useSettings } from '@/context/SettingsContext';
import { useTheme } from '@/context/ThemeContext';
import { friendlyApiMessage } from '@/lib/api';
import {
  collectTagSummaries,
  deleteTagEverywhere,
  displayTag,
  normalizeTag,
  renameTagEverywhere,
  type TagSummary,
} from '@/lib/tags';
import { fonts, radius, spacing } from '@/constants/theme';
import { TagIcon } from '@/components/icons/TagIcon';
import { ActionSheet, SheetAction } from '@/components/ui/ActionSheet';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/ui/StateViews';

/**
 * Tag Management — list all diary tags with edit / delete (screenshot layout).
 */
export default function TagsScreen() {
  const { api } = useSettings();
  const { tokens, isDark } = useTheme();
  const router = useRouter();

  const [tags, setTags] = useState<TagSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [editTarget, setEditTarget] = useState<TagSummary | null>(null);
  const [editName, setEditName] = useState('');
  const [sheet, setSheet] = useState<{
    title: string;
    message?: string;
    actions: SheetAction[];
  } | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const list = await collectTagSummaries(api);
      setTags(list);
    } catch (e: unknown) {
      setError(friendlyApiMessage(e));
    } finally {
      setLoading(false);
      setBusy(false);
    }
  }, [api]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const openOptions = (tag: TagSummary) => {
    setSheet({
      title: displayTag(tag.name),
      message: `${tag.count} entr${tag.count === 1 ? 'y' : 'ies'} use this tag.`,
      actions: [
        {
          key: 'edit',
          label: 'Edit',
          icon: '✎',
          onPress: () => {
            setTimeout(() => openEdit(tag), 200);
          },
        },
        {
          key: 'delete',
          label: 'Delete',
          icon: '⌫',
          destructive: true,
          onPress: () => {
            setTimeout(() => askDelete(tag), 200);
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

  const askDelete = (tag: TagSummary) => {
    setSheet({
      title: `Delete ${displayTag(tag.name)}?`,
      message: `Removes this tag from ${tag.count} entr${tag.count === 1 ? 'y' : 'ies'}. Days stay intact.`,
      actions: [
        {
          key: 'delete',
          label: 'Delete tag',
          icon: '⌫',
          destructive: true,
          onPress: () => void runDelete(tag.name),
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

  const runDelete = async (name: string) => {
    setBusy(true);
    try {
      await deleteTagEverywhere(api, name);
      await load();
    } catch (e: unknown) {
      setSheet({
        title: 'Could not delete',
        message: friendlyApiMessage(e),
        actions: [{ key: 'ok', label: 'Got it', icon: '✓', onPress: () => undefined }],
      });
      setBusy(false);
    }
  };

  const openEdit = (tag: TagSummary) => {
    setEditTarget(tag);
    setEditName(tag.name);
  };

  const saveEdit = async () => {
    if (!editTarget) return;
    const next = normalizeTag(editName);
    if (!next) return;
    setBusy(true);
    try {
      await renameTagEverywhere(api, editTarget.name, next);
      setEditTarget(null);
      await load();
    } catch (e: unknown) {
      setSheet({
        title: 'Could not rename',
        message: friendlyApiMessage(e),
        actions: [{ key: 'ok', label: 'Got it', icon: '✓', onPress: () => undefined }],
      });
      setBusy(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: tokens.bg }]}>
      <Stack.Screen options={{ title: 'Tag Management', headerBackTitle: 'Back' }} />

      {loading ? (
        <LoadingBlock message="Loading tags…" />
      ) : error ? (
        <ErrorBlock
          message={error}
          onRetry={() => {
            setLoading(true);
            load();
          }}
        />
      ) : tags.length === 0 ? (
        <EmptyBlock
          title="No tags yet"
          subtitle="Open a day, tap the tag tool in the bottom tray, and add tags like travel or family."
          actionLabel="Write today"
          onAction={() => {
            const d = new Date();
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
              d.getDate()
            ).padStart(2, '0')}`;
            router.push(`/day/${key}`);
          }}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {busy ? (
            <View style={styles.busy}>
              <ActivityIndicator color={tokens.accent} />
            </View>
          ) : null}
          {tags.map((tag) => (
            <View
              key={tag.name}
              style={[styles.row, { borderBottomColor: tokens.line }]}
            >
              <Pressable
                style={styles.rowMain}
                onPress={() =>
                  setSheet({
                    title: displayTag(tag.name),
                    message: `Used on ${tag.count} day${tag.count === 1 ? '' : 's'}.`,
                    actions: [
                      {
                        key: 'ok',
                        label: 'Got it',
                        icon: '✓',
                        onPress: () => undefined,
                      },
                    ],
                  })
                }
              >
                <Text style={[styles.hash, { color: tokens.text }]}>
                  {displayTag(tag.name)}
                </Text>
                <Text style={[styles.count, { color: tokens.textMuted }]}>
                  {tag.count} {tag.count === 1 ? 'Entry' : 'Entries'}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => openOptions(tag)}
                hitSlop={12}
                style={styles.dotsBtn}
                accessibilityLabel={`Options for ${tag.name}`}
              >
                <Text style={[styles.dots, { color: tokens.textMuted }]}>⋮</Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}

      <Modal visible={!!editTarget} transparent animationType="fade">
        <Pressable style={styles.modalDim} onPress={() => setEditTarget(null)}>
          <View
            style={[styles.editSheet, { backgroundColor: tokens.bgElevated, borderColor: tokens.line }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.editHead}>
              <TagIcon color={tokens.text} variant={isDark ? 'dark' : 'light'} size={22} />
              <Text style={[styles.editTitle, { color: tokens.text }]}>Edit tag</Text>
            </View>
            <TextInput
              style={[
                styles.editInput,
                { color: tokens.text, borderBottomColor: tokens.accent },
              ]}
              value={editName}
              onChangeText={setEditName}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={() => void saveEdit()}
            />
            <View style={styles.editActions}>
              <Pressable onPress={() => setEditTarget(null)}>
                <Text style={{ color: tokens.textMuted, fontFamily: fonts.body }}>Cancel</Text>
              </Pressable>
              <Pressable onPress={() => void saveEdit()}>
                <Text style={{ color: tokens.accent, fontFamily: fonts.bodyMedium }}>Save</Text>
              </Pressable>
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
  list: {
    paddingBottom: 40,
  },
  busy: {
    padding: spacing.md,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 1,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
    flexWrap: 'wrap',
  },
  hash: {
    fontFamily: fonts.body,
    fontSize: 17,
  },
  count: {
    fontFamily: fonts.body,
    fontSize: 14,
  },
  dotsBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: {
    fontSize: 22,
    fontFamily: fonts.bodyMedium,
  },
  modalDim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  editSheet: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
  },
  editHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: spacing.md,
  },
  editTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
  },
  editInput: {
    fontFamily: fonts.body,
    fontSize: 18,
    borderBottomWidth: 1.5,
    paddingVertical: 10,
    marginBottom: spacing.lg,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 24,
  },
});
