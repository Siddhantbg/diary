import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSettings } from '@/context/SettingsContext';
import { useTheme } from '@/context/ThemeContext';
import { DiaryEntry, friendlyApiMessage } from '@/lib/api';
import { EntryCard } from '@/components/EntryCard';
import { fonts, spacing } from '@/constants/theme';

export default function SearchScreen() {
  const { api } = useSettings();
  const { tokens } = useTheme();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<DiaryEntry[]>([]);
  const [favorites, setFavorites] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .listFavorites()
      .then(setFavorites)
      .catch(() => setFavorites([]));
  }, [api]);

  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setResults([]);
      setError('');
      return;
    }

    const handle = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const data = await api.search(term);
        setResults(data);
      } catch (e: unknown) {
        setError(friendlyApiMessage(e));
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(handle);
  }, [q, api]);

  return (
    <View style={[styles.screen, { backgroundColor: tokens.bg }]}>
      <TextInput
        style={[
          styles.input,
          { color: tokens.text, borderBottomColor: tokens.accent },
        ]}
        placeholder="Search titles, people, tags, words…"
        placeholderTextColor={tokens.textMuted}
        value={q}
        onChangeText={setQ}
        autoCorrect={false}
        autoFocus
      />
      {loading ? (
        <ActivityIndicator color={tokens.accent} style={{ marginVertical: 12 }} />
      ) : null}
      {!!error && <Text style={{ color: tokens.danger, marginBottom: 8 }}>{error}</Text>}

      {q.trim() ? (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <EntryCard entry={item} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            !loading ? (
              <Text style={{ color: tokens.textMuted }}>No matching memories.</Text>
            ) : null
          }
        />
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <EntryCard entry={item} />}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={{ marginBottom: spacing.sm }}>
              <Text style={[styles.section, { color: tokens.text }]}>Cherished days</Text>
              <Text style={{ color: tokens.textMuted, fontFamily: fonts.body }}>
                Favorites appear here when you are not searching.
              </Text>
            </View>
          }
          ListEmptyComponent={
            <Text style={{ color: tokens.textMuted }}>Star a day to keep it close.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  input: {
    fontFamily: fonts.body,
    fontSize: 17,
    borderBottomWidth: 1.5,
    paddingVertical: 10,
    marginBottom: spacing.md,
  },
  list: { paddingBottom: 40 },
  section: {
    fontFamily: fonts.display,
    fontSize: 22,
  },
});
