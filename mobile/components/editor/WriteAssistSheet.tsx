import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { fonts, radius, spacing } from '@/constants/theme';
import { SheetCloseButton } from '@/components/ui/SheetClose';
import { friendlyApiMessage } from '@/lib/api';
import { useSettings } from '@/context/SettingsContext';

export type AssistMode = 'fix' | 'complete' | 'suggest';

type Props = {
  visible: boolean;
  title: string;
  text: string;
  onClose: () => void;
  /** Apply fixed / continued text into the editor. */
  onApply: (nextText: string) => void;
};

const ACTIONS: { mode: AssistMode; label: string; hint: string }[] = [
  { mode: 'fix', label: 'Fix writing', hint: 'Spelling, grammar, clarity' },
  { mode: 'complete', label: 'Continue', hint: 'Append what might come next' },
  { mode: 'suggest', label: 'Suggest ideas', hint: 'Three short next-line ideas' },
];

/**
 * Gemini-backed writing help for the day editor.
 */
export function WriteAssistSheet({ visible, title, text, onClose, onApply }: Props) {
  const { tokens } = useTheme();
  const { api } = useSettings();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[] | null>(null);

  const reset = () => {
    setBusy(false);
    setError(null);
    setSuggestions(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const run = async (mode: AssistMode) => {
    setBusy(true);
    setError(null);
    setSuggestions(null);
    try {
      const res = await api.writeAssist({ mode, text, title });
      if (mode === 'suggest') {
        const list = res.suggestions?.filter(Boolean) || [];
        if (!list.length && res.text) list.push(res.text);
        setSuggestions(list.length ? list : ['(No ideas returned — try again.)']);
      } else if (mode === 'complete') {
        const add = (res.text || '').trim();
        const base = text.trimEnd();
        const next = base ? `${base}${base.endsWith('\n') ? '' : '\n\n'}${add}` : add;
        onApply(next);
        handleClose();
      } else {
        onApply((res.text || '').trim());
        handleClose();
      }
    } catch (e) {
      setError(friendlyApiMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.layer}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={handleClose} />
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
                { backgroundColor: tokens.bgElevated, borderColor: tokens.line },
              ]}
            >
              <View style={styles.header}>
                <Text style={[styles.title, { color: tokens.text }]}>Writing help</Text>
                <SheetCloseButton onPress={handleClose} />
              </View>
              <Text style={[styles.hint, { color: tokens.textMuted }]}>
                Fix typos, continue your entry, or get ideas for what to write next.
              </Text>

              {busy ? (
                <View style={styles.busy}>
                  <ActivityIndicator color={tokens.accent} />
                  <Text style={[styles.busyText, { color: tokens.textMuted }]}>Thinking…</Text>
                </View>
              ) : suggestions ? (
                <View style={styles.list}>
                  {suggestions.map((s, i) => (
                    <Pressable
                      key={`${i}-${s.slice(0, 12)}`}
                      onPress={() => {
                        const base = text.trimEnd();
                        const next = base
                          ? `${base}${base.endsWith('\n') ? '' : '\n\n'}${s}`
                          : s;
                        onApply(next);
                        handleClose();
                      }}
                      style={[styles.rowBtn, { borderColor: tokens.line }]}
                    >
                      <Text style={[styles.rowLabel, { color: tokens.text }]}>{s}</Text>
                    </Pressable>
                  ))}
                  <Pressable onPress={() => setSuggestions(null)} hitSlop={8}>
                    <Text style={[styles.back, { color: tokens.textMuted }]}>Back</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.list}>
                  {ACTIONS.map((a) => (
                    <Pressable
                      key={a.mode}
                      onPress={() => void run(a.mode)}
                      style={[styles.rowBtn, { borderColor: tokens.line }]}
                    >
                      <Text style={[styles.rowLabel, { color: tokens.text }]}>{a.label}</Text>
                      <Text style={[styles.rowHint, { color: tokens.textMuted }]}>{a.hint}</Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {error ? (
                <Text style={[styles.error, { color: tokens.danger }]}>{error}</Text>
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
  list: {
    gap: 8,
  },
  rowBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  rowLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
  },
  rowHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 2,
  },
  busy: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 10,
  },
  busyText: {
    fontFamily: fonts.body,
    fontSize: 13,
  },
  back: {
    alignSelf: 'center',
    fontFamily: fonts.body,
    fontSize: 14,
    marginTop: 8,
    paddingVertical: 6,
  },
  error: {
    fontFamily: fonts.body,
    fontSize: 13,
    marginTop: 12,
  },
});
