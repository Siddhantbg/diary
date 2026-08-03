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
import { DiaryEntry } from '@/lib/api';
import { EntryCard } from '@/components/EntryCard';
import { colors, fonts, spacing } from '@/constants/theme';

export default function SearchScreen() {
  const { api } = useSettings();
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
        setError(e instanceof Error ? e.message : 'Search failed');
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(handle);
  }, [q, api]);

  return (
    <View style={styles.screen}>
      <TextInput
        style={styles.input}
        placeholder="Search titles, people, tags, words…"
        placeholderTextColor={colors.inkMuted}
        value={q}
        onChangeText={setQ}
        autoCorrect={false}
      />
      {loading ? <ActivityIndicator color={colors.leaf} style={{ marginVertical: 12 }} /> : null}
      {!!error && <Text style={styles.error}>{error}</Text>}

      {q.trim() ? (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <EntryCard entry={item} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            !loading ? <Text style={styles.muted}>No matching memories.</Text> : null
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
              <Text style={styles.section}>Cherished days</Text>
              <Text style={styles.muted}>Favorites appear here when you are not searching.</Text>
            </View>
          }
          ListEmptyComponent={<Text style={styles.muted}>Star a day to keep it close.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.paper,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  input: {
    fontFamily: fonts.body,
    fontSize: 17,
    color: colors.ink,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.leaf,
    paddingVertical: 10,
    marginBottom: spacing.md,
  },
  list: { paddingBottom: 40 },
  section: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.ink,
  },
  muted: {
    fontFamily: fonts.body,
    color: colors.inkMuted,
    marginTop: 6,
  },
  error: {
    fontFamily: fonts.body,
    color: colors.danger,
    marginBottom: 8,
  },
});
