import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { fonts, radius, spacing } from '@/constants/theme';
import { normalizeTag, parseTagsText, tagsToText } from '@/lib/tags';
import { TagIcon } from '@/components/icons/TagIcon';

type Props = {
  value: string;
  onChange: (next: string) => void;
  inputRef?: React.RefObject<TextInput | null>;
};

/** Chip list + quick-add field for day tags. */
export function TagsEditor({ value, onChange, inputRef }: Props) {
  const { tokens, isDark } = useTheme();
  const tags = parseTagsText(value);
  const [draft, setDraft] = useState('');

  const commit = (raw: string) => {
    const t = normalizeTag(raw);
    if (!t) return;
    const lower = t.toLowerCase();
    if (tags.some((x) => x.toLowerCase() === lower)) {
      setDraft('');
      return;
    }
    onChange(tagsToText([...tags, t]));
    setDraft('');
  };

  const remove = (name: string) => {
    const lower = name.toLowerCase();
    onChange(tagsToText(tags.filter((t) => t.toLowerCase() !== lower)));
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <TagIcon color={tokens.textMuted} variant={isDark ? 'dark' : 'light'} size={16} />
        <Text style={[styles.label, { color: tokens.textMuted }]}>Tags</Text>
      </View>

      {tags.length ? (
        <View style={styles.chips}>
          {tags.map((t) => (
            <View
              key={t}
              style={[
                styles.chip,
                { backgroundColor: tokens.accentSoft, borderColor: tokens.line },
              ]}
            >
              <Text style={[styles.chipText, { color: tokens.accent }]}># {t}</Text>
              <Pressable
                onPress={() => remove(t)}
                hitSlop={8}
                accessibilityLabel={`Remove tag ${t}`}
              >
                <Text style={{ color: tokens.textMuted, fontSize: 14, marginLeft: 4 }}>×</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : (
        <Text style={[styles.hint, { color: tokens.textSubtle }]}>
          No tags yet — add one below
        </Text>
      )}

      <View style={styles.addRow}>
        <TextInput
          ref={inputRef as never}
          style={[
            styles.input,
            { color: tokens.text, borderBottomColor: tokens.line },
          ]}
          placeholder="Add a tag…"
          placeholderTextColor={tokens.textSubtle}
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={() => commit(draft)}
          returnKeyType="done"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Pressable
          onPress={() => commit(draft)}
          style={[styles.addBtn, { backgroundColor: tokens.accent }]}
          accessibilityLabel="Add tag"
        >
          <Text style={styles.addBtnText}>ADD</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 13,
    marginBottom: 8,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 16,
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  addBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.sm,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    letterSpacing: 0.6,
  },
});
