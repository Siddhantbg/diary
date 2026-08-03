import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSettings } from '@/context/SettingsContext';
import { DiaryEntry } from '@/lib/api';
import { MoodPicker } from '@/components/MoodPicker';
import { PhotoGrid } from '@/components/PhotoGrid';
import { formatLogTime, formatLongDate } from '@/lib/dates';
import { colors, fonts, spacing } from '@/constants/theme';

const emptyEntry = (date: string): DiaryEntry => ({
  id: '',
  date,
  title: '',
  body: '',
  logs: [],
  mood: null,
  tags: [],
  people: [],
  favorite: false,
  photoIds: [],
  weatherNote: '',
});

export default function DayScreen() {
  const params = useLocalSearchParams<{ date: string }>();
  const date = Array.isArray(params.date) ? params.date[0] : params.date;
  const { api } = useSettings();
  const router = useRouter();

  const [entry, setEntry] = useState<DiaryEntry>(emptyEntry(date || ''));
  const [draft, setDraft] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [peopleText, setPeopleText] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingMeta, setSavingMeta] = useState(false);
  const [savingLog, setSavingLog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');

  const stateRef = useRef({ entry, tagsText, peopleText });
  stateRef.current = { entry, tagsText, peopleText };

  const load = useCallback(async () => {
    if (!api || !date) {
      setLoading(false);
      setError(!api ? 'Connect API in Settings.' : 'Missing date');
      return;
    }
    setError('');
    try {
      const data = await api.getEntry(date);
      setEntry({ ...data, logs: data.logs || [] });
      setTagsText(data.tags.join(', '));
      setPeopleText(data.people.join(', '));
      setDirty(false);
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'status' in e && (e as { status: number }).status === 404) {
        setEntry(emptyEntry(date));
        setTagsText('');
        setPeopleText('');
        setDirty(false);
      } else {
        setError(e instanceof Error ? e.message : 'Failed to load day');
      }
    } finally {
      setLoading(false);
    }
  }, [api, date]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const patch = <K extends keyof DiaryEntry>(key: K, value: DiaryEntry[K]) => {
    setEntry((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const saveMeta = useCallback(async () => {
    if (!api || !date) return;
    setSavingMeta(true);
    setError('');
    try {
      const current = stateRef.current;
      const payload = {
        title: current.entry.title,
        mood: current.entry.mood,
        favorite: current.entry.favorite,
        weatherNote: current.entry.weatherNote,
        tags: current.tagsText
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        people: current.peopleText
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      };
      const saved = await api.saveEntry(date, payload);
      setEntry({ ...saved, logs: saved.logs || [] });
      setTagsText(saved.tags.join(', '));
      setPeopleText(saved.people.join(', '));
      setDirty(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSavingMeta(false);
    }
  }, [api, date]);

  const saveLog = async () => {
    if (!api || !date) return;
    const text = draft.trim();
    if (!text) {
      Alert.alert('Empty log', 'Write something before saving.');
      return;
    }

    setSavingLog(true);
    setError('');
    try {
      if (dirty) await saveMeta();
      // Device system time at the moment you tap Save
      const at = new Date().toISOString();
      const saved = await api.addLog(date, text, at);
      setEntry({ ...saved, logs: saved.logs || [] });
      setDraft('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save log');
    } finally {
      setSavingLog(false);
    }
  };

  const removeLog = (logId: string) => {
    Alert.alert('Delete this log?', 'Only this timed note will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!api || !date) return;
          try {
            const saved = await api.deleteLog(date, logId);
            setEntry({ ...saved, logs: saved.logs || [] });
          } catch (e: unknown) {
            Alert.alert('Error', e instanceof Error ? e.message : 'Delete failed');
          }
        },
      },
    ]);
  };

  const addPhoto = async () => {
    if (!api || !date) return;

    const choice = await new Promise<'camera' | 'library' | null>((resolve) => {
      Alert.alert('Add photo', 'Choose a source', [
        { text: 'Camera', onPress: () => resolve('camera') },
        { text: 'Library', onPress: () => resolve('library') },
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
      ]);
    });
    if (!choice) return;

    let result: ImagePicker.ImagePickerResult;
    if (choice === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Camera access is required.');
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        exif: false,
      });
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Photo library access is required.');
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: 6,
      });
    }

    if (result.canceled || !result.assets?.length) return;

    setUploading(true);
    try {
      if (dirty) await saveMeta();
      let latest = entry;
      for (const asset of result.assets) {
        const res = await api.uploadPhoto(date, asset.uri);
        latest = res.entry;
      }
      setEntry({ ...latest, logs: latest.logs || [] });
    } catch (e: unknown) {
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setUploading(false);
    }
  };

  const deletePhoto = (id: string) => {
    Alert.alert('Remove photo?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!api) return;
          try {
            await api.deletePhoto(id);
            setEntry((prev) => ({
              ...prev,
              photoIds: prev.photoIds.filter((p) => p !== id),
            }));
          } catch (e: unknown) {
            Alert.alert('Error', e instanceof Error ? e.message : 'Delete failed');
          }
        },
      },
    ]);
  };

  const removeDay = () => {
    Alert.alert('Delete this day?', 'All logs and photos will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!api || !date) return;
          try {
            await api.deleteEntry(date);
            router.back();
          } catch (e: unknown) {
            Alert.alert('Error', e instanceof Error ? e.message : 'Delete failed');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.leaf} />
      </View>
    );
  }

  const logs = entry.logs || [];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen
        options={{
          title: date ? formatLongDate(date) : 'Day',
          headerRight: () => (
            <Pressable
              onPress={() => saveMeta()}
              disabled={savingMeta}
              style={{ paddingHorizontal: 8 }}
            >
              <Text style={{ fontFamily: fonts.bodyMedium, color: colors.leaf }}>
                {savingMeta ? '…' : 'Save'}
              </Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        {!!error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.favoriteRow}>
          <Pressable onPress={() => patch('favorite', !entry.favorite)} style={styles.favoriteBtn}>
            <Text style={styles.favoriteText}>
              {entry.favorite ? '★ Cherished' : '☆ Mark cherished'}
            </Text>
          </Pressable>
          {dirty ? <Text style={styles.dirty}>Unsaved details</Text> : null}
        </View>

        <TextInput
          style={styles.title}
          placeholder="Title this day"
          placeholderTextColor={colors.inkMuted}
          value={entry.title}
          onChangeText={(t) => patch('title', t)}
        />

        <Text style={styles.sectionLabel}>Timeline</Text>
        {logs.length === 0 ? (
          <Text style={styles.muted}>No logs yet — write below and tap Save log.</Text>
        ) : (
          logs.map((log) => (
            <Pressable
              key={log.id}
              style={styles.logBlock}
              onLongPress={() => removeLog(log.id)}
            >
              <Text style={styles.logTime}>{formatLogTime(log.at)}</Text>
              <Text style={styles.logText}>{log.text}</Text>
            </Pressable>
          ))
        )}

        <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>New log</Text>
        <TextInput
          style={styles.draft}
          placeholder="What is happening right now?"
          placeholderTextColor={colors.inkMuted}
          value={draft}
          onChangeText={setDraft}
          multiline
          textAlignVertical="top"
        />
        <Pressable style={styles.saveLog} onPress={saveLog} disabled={savingLog}>
          <Text style={styles.saveLogText}>
            {savingLog ? 'Saving…' : 'Save log (uses phone time)'}
          </Text>
        </Pressable>
        <Text style={styles.hint}>Long-press a log to delete it.</Text>

        <MoodPicker value={entry.mood} onChange={(m) => patch('mood', m)} />

        <Text style={styles.label}>People</Text>
        <TextInput
          style={styles.field}
          placeholder="names, comma separated"
          placeholderTextColor={colors.inkMuted}
          value={peopleText}
          onChangeText={(t) => {
            setPeopleText(t);
            setDirty(true);
          }}
        />

        <Text style={styles.label}>Tags</Text>
        <TextInput
          style={styles.field}
          placeholder="travel, family, work…"
          placeholderTextColor={colors.inkMuted}
          value={tagsText}
          onChangeText={(t) => {
            setTagsText(t);
            setDirty(true);
          }}
        />

        <Text style={styles.label}>Weather note</Text>
        <TextInput
          style={styles.field}
          placeholder="soft rain, golden evening…"
          placeholderTextColor={colors.inkMuted}
          value={entry.weatherNote}
          onChangeText={(t) => patch('weatherNote', t)}
        />

        <PhotoGrid
          photoIds={entry.photoIds}
          onAdd={addPhoto}
          onDelete={deletePhoto}
          uploading={uploading}
        />

        <Pressable style={styles.saveBig} onPress={saveMeta} disabled={savingMeta}>
          <Text style={styles.saveBigText}>
            {savingMeta ? 'Saving…' : 'Save day details'}
          </Text>
        </Pressable>

        {entry.id ? (
          <Pressable onPress={removeDay} style={styles.deleteDay}>
            <Text style={styles.deleteDayText}>Delete this day</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: spacing.lg, paddingBottom: 60 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper },
  favoriteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  favoriteBtn: {
    paddingVertical: 6,
  },
  favoriteText: {
    fontFamily: fonts.bodyMedium,
    color: colors.favorite,
    fontSize: 15,
  },
  dirty: {
    fontFamily: fonts.body,
    color: colors.accent,
    fontSize: 12,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.ink,
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  muted: {
    fontFamily: fonts.body,
    color: colors.inkMuted,
    marginBottom: spacing.md,
  },
  logBlock: {
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  logTime: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.leaf,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  logText: {
    fontFamily: fonts.body,
    fontSize: 17,
    lineHeight: 26,
    color: colors.ink,
  },
  draft: {
    fontFamily: fonts.body,
    fontSize: 17,
    lineHeight: 26,
    color: colors.ink,
    minHeight: 110,
    marginBottom: spacing.sm,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.leaf,
    paddingBottom: spacing.sm,
  },
  saveLog: {
    backgroundColor: colors.leaf,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveLogText: {
    color: colors.white,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkMuted,
    marginTop: 8,
    marginBottom: spacing.sm,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginTop: spacing.md,
    marginBottom: 4,
  },
  field: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingVertical: 8,
  },
  saveBig: {
    marginTop: spacing.xl,
    backgroundColor: colors.ink,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBigText: {
    color: colors.white,
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
  },
  deleteDay: {
    marginTop: spacing.lg,
    alignItems: 'center',
    padding: 12,
  },
  deleteDayText: {
    fontFamily: fonts.body,
    color: colors.danger,
  },
  error: {
    fontFamily: fonts.body,
    color: colors.danger,
    marginBottom: spacing.sm,
  },
});
