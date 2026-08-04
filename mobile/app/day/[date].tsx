import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { Calendar, DateData } from 'react-native-calendars';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSettings } from '@/context/SettingsContext';
import { useTheme } from '@/context/ThemeContext';
import { DiaryEntry } from '@/lib/api';
import { MoodSheet } from '@/components/editor/MoodSheet';
import { DateTimePickerModal } from '@/components/editor/DateTimePickerModal';
import { EditorToolStrip, ToolId } from '@/components/editor/EditorToolStrip';
import { VoiceNotes } from '@/components/editor/VoiceNotes';
import { TagsEditor } from '@/components/editor/TagsEditor';
import { PhotoGrid } from '@/components/PhotoGrid';
import { SheetHeader } from '@/components/ui/SheetClose';
import { ActionSheet, SheetAction } from '@/components/ui/ActionSheet';
import { GalleryIcon } from '@/components/icons/GalleryIcon';
import {
  getEntryDateParts,
  MOOD_COLORS,
  MOOD_EMOJIS,
  shiftDateKey,
  toDateKey,
} from '@/lib/dates';
import { formatPrefTime, usePreferences } from '@/context/PreferencesContext';
import { fonts, radius, spacing } from '@/constants/theme';
import {
  draftHasWork,
  loadEntryDraft,
  saveEntryDraft,
  clearEntryDraft,
  type EntryDraft,
} from '@/lib/entryDraft';
import {
  defaultLegends,
  DiaryLegend,
  loadLegends,
  legendById,
} from '@/lib/legends';

type DaySheet = {
  title: string;
  message?: string;
  actions: SheetAction[];
};

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
  legendId: '',
  photoIds: [],
  voiceIds: [],
  weatherNote: '',
});

/** Default mood circle (reference orange neutral face). */
const NEUTRAL_MOOD = '😐';

function snapshotDraft(input: {
  draft: string;
  title: string;
  tagsText: string;
  peopleText: string;
  mood: number | null;
  favorite: boolean;
  legendId: string;
  weatherNote: string;
  customLogTime: Date | null;
}): EntryDraft {
  return {
    draft: input.draft,
    title: input.title,
    tagsText: input.tagsText,
    peopleText: input.peopleText,
    mood: input.mood,
    favorite: input.favorite,
    legendId: input.legendId || '',
    weatherNote: input.weatherNote,
    customLogTimeIso: input.customLogTime
      ? input.customLogTime.toISOString()
      : null,
    updatedAt: Date.now(),
  };
}

export default function DayScreen() {
  const params = useLocalSearchParams<{ date: string }>();
  const date = Array.isArray(params.date) ? params.date[0] : params.date;
  const { api } = useSettings();
  const { tokens, isDark } = useTheme();
  const { prefs } = usePreferences();
  const router = useRouter();

  const [entry, setEntry] = useState<DiaryEntry>(emptyEntry(date || ''));
  const [draft, setDraft] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [peopleText, setPeopleText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingMs, setRecordingMs] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [draftNotice, setDraftNotice] = useState(false);

  const [moodOpen, setMoodOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [dateSwitchOpen, setDateSwitchOpen] = useState(false);
  const [showTags, setShowTags] = useState(false);
  const [showPhotos, setShowPhotos] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [customLogTime, setCustomLogTime] = useState<Date | null>(null);
  const [daySheet, setDaySheet] = useState<DaySheet | null>(null);
  const [legends, setLegends] = useState<DiaryLegend[]>(defaultLegends());

  useFocusEffect(
    useCallback(() => {
      void loadLegends().then(setLegends);
    }, [])
  );

  const openSheet = (sheet: DaySheet) => setDaySheet(sheet);
  const closeSheet = () => setDaySheet(null);
  const notice = (title: string, message: string) =>
    openSheet({
      title,
      message,
      actions: [{ key: 'ok', label: 'Got it', icon: '✓', onPress: () => undefined }],
    });

  const titleRef = useRef<TextInput>(null);
  const draftRef = useRef<TextInput>(null);
  const tagsRef = useRef<TextInput>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stateRef = useRef({
    entry,
    tagsText,
    peopleText,
    dirty,
    draft,
    customLogTime,
  });
  stateRef.current = { entry, tagsText, peopleText, dirty, draft, customLogTime };
  /** Avoid writing drafts during server load / restore apply. */
  const canPersistDraftRef = useRef(false);

  const clearRecordTimer = () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
  };

  const flushDraft = useCallback(async () => {
    if (!date) return;
    const s = stateRef.current;
    await saveEntryDraft(
      date,
      snapshotDraft({
        draft: s.draft,
        title: s.entry.title,
        tagsText: s.tagsText,
        peopleText: s.peopleText,
        mood: s.entry.mood,
        favorite: s.entry.favorite,
        legendId: s.entry.legendId || '',
        weatherNote: s.entry.weatherNote,
        customLogTime: s.customLogTime,
      })
    );
  }, [date]);

  const applyLocalDraft = useCallback((local: EntryDraft, base: DiaryEntry) => {
    setEntry({
      ...base,
      title: local.title,
      mood: local.mood,
      favorite: local.favorite,
      legendId: local.legendId || '',
      weatherNote: local.weatherNote,
    });
    setTagsText(local.tagsText);
    setPeopleText(local.peopleText);
    setDraft(local.draft);
    if (local.customLogTimeIso) {
      const t = new Date(local.customLogTimeIso);
      setCustomLogTime(Number.isNaN(t.getTime()) ? null : t);
    } else {
      setCustomLogTime(null);
    }
    const metaChanged =
      local.title !== (base.title || '') ||
      local.mood !== (base.mood ?? null) ||
      local.favorite !== !!base.favorite ||
      (local.legendId || '') !== (base.legendId || '') ||
      local.weatherNote !== (base.weatherNote || '') ||
      local.tagsText !== (base.tags || []).join(', ') ||
      local.peopleText !== (base.people || []).join(', ');
    setDirty(metaChanged || !!local.draft.trim());
    if (local.tagsText.trim() || local.peopleText.trim()) setShowTags(true);
    setDraftNotice(!!local.draft.trim() || metaChanged);
  }, []);

  const load = useCallback(async () => {
    if (!api || !date) {
      setLoading(false);
      setError(!date ? 'Missing date' : 'Loading…');
      return;
    }
    canPersistDraftRef.current = false;
    setError('');
    setDraftNotice(false);
    try {
      const data = await api.getEntry(date);
      const base = {
        ...data,
        logs: data.logs || [],
        voiceIds: data.voiceIds || [],
        photoIds: data.photoIds || [],
        legendId: data.legendId || '',
      };
      setEntry(base);
      setTagsText(data.tags.join(', '));
      setPeopleText(data.people.join(', '));
      setDirty(false);
      setShowPhotos((data.photoIds?.length ?? 0) > 0);
      setShowLogs((data.logs?.length ?? 0) > 0);
      setShowTags((data.tags?.length ?? 0) > 0 || (data.people?.length ?? 0) > 0);
      setDraft('');

      const local = await loadEntryDraft(date);
      if (local && draftHasWork(local)) {
        applyLocalDraft(local, base);
      }
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'status' in e && (e as { status: number }).status === 404) {
        const base = emptyEntry(date);
        setEntry(base);
        setTagsText('');
        setPeopleText('');
        setDirty(false);
        setShowPhotos(false);
        setShowLogs(false);
        setDraft('');
        const local = await loadEntryDraft(date);
        if (local && draftHasWork(local)) {
          applyLocalDraft(local, base);
        }
      } else {
        setError(e instanceof Error ? e.message : 'Failed to load day');
      }
    } finally {
      setLoading(false);
      requestAnimationFrame(() => {
        canPersistDraftRef.current = true;
      });
    }
  }, [api, date, applyLocalDraft]);

  useEffect(() => {
    return () => {
      clearRecordTimer();
      const rec = recordingRef.current;
      recordingRef.current = null;
      if (rec) {
        void rec.stopAndUnloadAsync().catch(() => undefined);
      }
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setCustomLogTime(null);
      load();
      return () => {
        // Accidental exit / back navigation — keep work as a local draft
        canPersistDraftRef.current = false;
        void flushDraft();
      };
    }, [load, flushDraft])
  );

  // Debounced autosave of unsaved compose + meta to the phone
  useEffect(() => {
    if (loading || !date || !canPersistDraftRef.current) return;
    const timer = setTimeout(() => {
      void saveEntryDraft(
        date,
        snapshotDraft({
          draft,
          title: entry.title,
          tagsText,
          peopleText,
          mood: entry.mood,
          favorite: entry.favorite,
          legendId: entry.legendId || '',
          weatherNote: entry.weatherNote,
          customLogTime,
        })
      );
    }, 350);
    return () => clearTimeout(timer);
  }, [
    loading,
    date,
    draft,
    entry.title,
    entry.mood,
    entry.favorite,
    entry.legendId,
    entry.weatherNote,
    tagsText,
    peopleText,
    customLogTime,
  ]);

  const patch = <K extends keyof DiaryEntry>(key: K, value: DiaryEntry[K]) => {
    setEntry((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
    setDraftNotice(false);
  };

  const saveMeta = useCallback(async () => {
    if (!api || !date) return;
    const current = stateRef.current;
    const payload = {
      title: current.entry.title,
      mood: current.entry.mood,
      favorite: current.entry.favorite,
      legendId: current.entry.legendId || '',
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
    setEntry({
      ...saved,
      logs: saved.logs || [],
      voiceIds: saved.voiceIds || [],
      photoIds: saved.photoIds || [],
    });
    setTagsText(saved.tags.join(', '));
    setPeopleText(saved.people.join(', '));
    setDirty(false);
    return saved;
  }, [api, date]);

  /** SAVE: meta + optional new moment (draft) timed from system clock (or custom picker). */
  const handleSave = useCallback(async () => {
    if (!api || !date) return;
    setSaving(true);
    setError('');
    try {
      const text = draft.trim();
      if (text) {
        if (stateRef.current.dirty) await saveMeta();
        // Device / system time at the moment of Save — unless a custom time was set from the toolbar
        const at = (customLogTime ?? new Date()).toISOString();
        const saved = await api.addLog(date, text, at);
        setEntry({
          ...saved,
          logs: saved.logs || [],
          voiceIds: saved.voiceIds || [],
          photoIds: saved.photoIds || [],
        });
        setDraft('');
        setCustomLogTime(null);
        setShowLogs(true);
        setDraftNotice(false);
        // Publish clears compose buffer; drop local draft for this day
        await clearEntryDraft(date);
      } else {
        await saveMeta();
        setDraftNotice(false);
        await clearEntryDraft(date);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }, [api, date, draft, customLogTime, saveMeta]);

  const removeLog = (logId: string) => {
    openSheet({
      title: 'Delete this moment?',
      message: 'Only this timed note will be removed. The rest of the day stays intact.',
      actions: [
        {
          key: 'delete',
          label: 'Delete moment',
          icon: '⌫',
          destructive: true,
          onPress: async () => {
            if (!api || !date) return;
            try {
              const saved = await api.deleteLog(date, logId);
              setEntry({
                ...saved,
                logs: saved.logs || [],
                voiceIds: saved.voiceIds || [],
                photoIds: saved.photoIds || [],
              });
            } catch (e: unknown) {
              notice('Could not delete', e instanceof Error ? e.message : 'Delete failed');
            }
          },
        },
        {
          key: 'keep',
          label: 'Keep moment',
          icon: '↩',
          cancel: true,
          onPress: () => undefined,
        },
      ],
    });
  };

  const pickPhotoFrom = async (choice: 'camera' | 'library') => {
    if (!api || !date) return;

    let result: ImagePicker.ImagePickerResult;
    if (choice === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        notice('Permission needed', 'Camera access is required to take photos.');
        return;
      }
      result = await ImagePicker.launchCameraAsync({ quality: 0.8, exif: false });
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        notice('Permission needed', 'Photo library access is required to attach photos.');
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
    setShowPhotos(true);
    try {
      if (stateRef.current.dirty) await saveMeta();
      let latest = entry;
      for (const asset of result.assets) {
        const res = await api.uploadPhoto(date, asset.uri);
        latest = res.entry;
      }
      setEntry({
        ...latest,
        logs: latest.logs || [],
        voiceIds: latest.voiceIds || [],
        photoIds: latest.photoIds || [],
      });
    } catch (e: unknown) {
      notice('Upload failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setUploading(false);
    }
  };

  const addPhoto = () => {
    if (!api || !date) return;
    openSheet({
      title: 'Add photo',
      message: 'Capture a new shot or pick from your library.',
      actions: [
        {
          key: 'camera',
          label: 'Camera',
          icon: '◎',
          onPress: () => void pickPhotoFrom('camera'),
        },
        {
          key: 'library',
          label: 'Photo library',
          icon: (
            <GalleryIcon
              color={tokens.text}
              variant={isDark ? 'dark' : 'light'}
              size={20}
            />
          ),
          onPress: () => void pickPhotoFrom('library'),
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

  const deletePhoto = (id: string) => {
    openSheet({
      title: 'Remove photo?',
      message: 'This cannot be undone.',
      actions: [
        {
          key: 'delete',
          label: 'Remove photo',
          icon: '⌫',
          destructive: true,
          onPress: async () => {
            if (!api) return;
            try {
              await api.deletePhoto(id);
              setEntry((prev) => ({
                ...prev,
                photoIds: prev.photoIds.filter((p) => p !== id),
              }));
            } catch (e: unknown) {
              notice('Could not delete', e instanceof Error ? e.message : 'Delete failed');
            }
          },
        },
        {
          key: 'keep',
          label: 'Keep photo',
          icon: '↩',
          cancel: true,
          onPress: () => undefined,
        },
      ],
    });
  };

  const startVoiceNote = async () => {
    if (!api || !date) return;
    if (Platform.OS === 'web') {
      notice('Voice notes', 'Microphone recording works in the mobile app (iOS/Android).');
      return;
    }
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        notice(
          'Microphone needed',
          'Allow microphone access so you can record voice notes for this day.'
        );
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = rec;
      setRecording(true);
      setRecordingMs(0);
      const startedAt = Date.now();
      clearRecordTimer();
      recordTimerRef.current = setInterval(() => {
        setRecordingMs(Date.now() - startedAt);
      }, 200);
    } catch (e: unknown) {
      recordingRef.current = null;
      setRecording(false);
      clearRecordTimer();
      notice('Mic', e instanceof Error ? e.message : 'Could not start recording');
    }
  };

  const stopVoiceNote = async () => {
    const rec = recordingRef.current;
    if (!rec || !api || !date) {
      setRecording(false);
      clearRecordTimer();
      return;
    }
    clearRecordTimer();
    setRecording(false);
    recordingRef.current = null;

    let uri: string | null = null;
    let durationMs = recordingMs;
    try {
      const status = await rec.getStatusAsync();
      if (status.isLoaded && typeof status.durationMillis === 'number') {
        durationMs = status.durationMillis;
      }
      await rec.stopAndUnloadAsync();
      uri = rec.getURI();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });
    } catch (e: unknown) {
      notice('Mic', e instanceof Error ? e.message : 'Could not stop recording');
      return;
    }

    if (!uri) {
      notice('Voice note', 'No audio was captured. Try again.');
      return;
    }
    if (durationMs < 400) {
      notice('Too short', 'Hold a little longer — that note was too brief.');
      return;
    }

    setUploadingVoice(true);
    try {
      if (stateRef.current.dirty) await saveMeta();
      const res = await api.uploadVoice(date, uri, durationMs);
      setEntry({
        ...res.entry,
        logs: res.entry.logs || [],
        voiceIds: res.entry.voiceIds || [],
      });
    } catch (e: unknown) {
      notice('Upload failed', e instanceof Error ? e.message : 'Could not save voice note');
    } finally {
      setUploadingVoice(false);
      setRecordingMs(0);
    }
  };

  const deleteVoice = async (id: string) => {
    if (!api) return;
    try {
      await api.deleteVoice(id);
      setEntry((prev) => ({
        ...prev,
        voiceIds: (prev.voiceIds || []).filter((v) => v !== id),
      }));
    } catch (e: unknown) {
      notice('Could not delete', e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const removeDay = () => {
    openSheet({
      title: 'Delete this day?',
      message: 'All moments, photos, and voice notes will be removed. This cannot be undone.',
      actions: [
        {
          key: 'delete',
          label: 'Delete entire day',
          icon: '⌫',
          destructive: true,
          onPress: async () => {
            if (!api || !date) return;
            try {
              await api.deleteEntry(date);
              await clearEntryDraft(date);
              router.back();
            } catch (e: unknown) {
              notice('Could not delete', e instanceof Error ? e.message : 'Delete failed');
            }
          },
        },
        {
          key: 'keep',
          label: 'Keep this day',
          icon: '↩',
          cancel: true,
          onPress: () => undefined,
        },
      ],
    });
  };

  const openOverflow = () => {
    openSheet({
      title: 'Day options',
      message: 'Timing, cherish, or clear this entry.',
      actions: [
        {
          key: 'time',
          label: customLogTime ? 'Use phone time for next save' : 'Set time for next save',
          icon: '◷',
          onPress: () => {
            if (customLogTime) setCustomLogTime(null);
            else setTimeOpen(true);
          },
        },
        {
          key: 'favorite',
          label: entry.favorite ? 'Remove from cherished' : 'Mark as cherished',
          icon: entry.favorite ? '☆' : '★',
          onPress: () => patch('favorite', !entry.favorite),
        },
        {
          key: 'delete',
          label: 'Delete day',
          icon: '⌫',
          destructive: true,
          onPress: () => removeDay(),
        },
      ],
    });
  };

  const goToDate = (next: string) => {
    setDateSwitchOpen(false);
    if (next === date) return;
    // Keep unsaved work as a local draft for this day, then switch
    void (async () => {
      await flushDraft();
      router.replace(`/day/${next}`);
    })();
  };

  const leaveDay = () => {
    void (async () => {
      await flushDraft();
      router.back();
    })();
  };

  const openLegendPicker = () => {
    const customs = legends.filter((l) => !l.system);
    openSheet({
      title: 'Day legend',
      message: 'Color this day on the calendar. Manage labels in the drawer → Legends.',
      actions: [
        {
          key: 'none',
          label: !entry.legendId ? 'No custom legend  · current' : 'No custom legend',
          icon: !entry.legendId ? '✓' : '○',
          onPress: () => {
            void applyLegend('');
          },
        },
        ...customs.map((l) => ({
          key: l.id,
          label: entry.legendId === l.id ? `${l.name}  · current` : l.name,
          icon: entry.legendId === l.id ? '✓' : '●',
          onPress: () => {
            void applyLegend(l.id);
          },
        })),
        {
          key: 'manage',
          label: 'Manage legends…',
          icon: '+',
          onPress: () => router.push('/legends'),
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

  const applyLegend = async (legendId: string) => {
    patch('legendId', legendId);
    if (!api || !date) return;
    try {
      const saved = await api.saveEntry(date, {
        title: entry.title,
        mood: entry.mood,
        favorite: entry.favorite,
        legendId,
        weatherNote: entry.weatherNote,
        tags: tagsText
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        people: peopleText
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      });
      setEntry((prev) => ({
        ...prev,
        ...saved,
        logs: saved.logs || prev.logs,
        legendId: saved.legendId || legendId,
      }));
    } catch {
      // draft still holds selection
    }
  };

  const onTool = (id: ToolId) => {
    switch (id) {
      case 'background':
        router.push('/themes');
        break;
      case 'photos':
        setShowPhotos(true);
        addPhoto();
        break;
      case 'favorite':
        patch('favorite', !entry.favorite);
        break;
      case 'mood':
        setMoodOpen(true);
        break;
      case 'title':
        titleRef.current?.focus();
        break;
      case 'legend':
        openLegendPicker();
        break;
      case 'tags':
        setShowTags((v) => !v);
        setTimeout(() => tagsRef.current?.focus(), 80);
        break;
      case 'mic':
        if (recording) void stopVoiceNote();
        else void startVoiceNote();
        break;
    }
  };

  if (loading || !date) {
    return (
      <View style={[styles.center, { backgroundColor: tokens.bg }]}>
        <ActivityIndicator color={tokens.accent} />
      </View>
    );
  }

  const logs = entry.logs || [];
  const parts = getEntryDateParts(date);
  const moodFace = entry.mood ? MOOD_EMOJIS[entry.mood] : NEUTRAL_MOOD;
  const moodTint = entry.mood ? MOOD_COLORS[entry.mood] : 'rgba(255, 160, 80, 0.9)';
  // Reference: "03 Aug 2026" with underline under day only
  const monthYearShort = parts.monthYear; // e.g. "Aug 2026"

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: tokens.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen
        options={{
          title: '',
          headerShadowVisible: false,
          headerBackVisible: false,
          headerStyle: { backgroundColor: tokens.bg },
          headerLeft: () => (
            <Pressable
              onPress={leaveDay}
              hitSlop={14}
              style={styles.headerIcon}
              accessibilityLabel="Back"
            >
              <Text style={[styles.backArrow, { color: tokens.text }]}>←</Text>
            </Pressable>
          ),
          headerRight: () => (
            <View style={styles.headerRight}>
              <Pressable onPress={openOverflow} hitSlop={10} style={styles.headerIcon}>
                <Text style={[styles.dots, { color: tokens.text }]}>···</Text>
              </Pressable>
              <Pressable
                onPress={handleSave}
                disabled={saving}
                style={[
                  styles.saveBtn,
                  { backgroundColor: tokens.accent, opacity: saving ? 0.7 : 1 },
                ]}
              >
                <Text style={styles.saveBtnText}>{saving ? '…' : 'SAVE'}</Text>
              </Pressable>
            </View>
          ),
        }}
      />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {!!error && (
          <Text style={[styles.error, { color: tokens.danger }]}>{error}</Text>
        )}

        {draftNotice || !!draft.trim() || dirty ? (
          <Text style={[styles.draftBanner, { color: tokens.textMuted }]}>
            {draftNotice
              ? 'Draft restored — still on this device until you SAVE'
              : 'Draft kept on this device if you leave'}
          </Text>
        ) : null}

        {/* Date + mood row — matches reference entry editor */}
        <View style={styles.dateRow}>
          <Pressable
            onPress={() => setDateSwitchOpen(true)}
            style={styles.dateBlock}
            accessibilityLabel="Change date"
          >
            <View>
              <Text style={[styles.dayNum, { color: tokens.text }]}>{parts.dayNum}</Text>
              <View style={[styles.dayUnderline, { backgroundColor: tokens.accent }]} />
            </View>
            <Text style={[styles.monthYear, { color: tokens.text }]}>
              {monthYearShort}{' '}
              <Text style={{ color: tokens.textMuted, fontSize: 12 }}>▼</Text>
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setMoodOpen(true)}
            style={[
              styles.moodCircle,
              {
                backgroundColor: moodTint,
                borderColor: entry.mood ? tokens.white : 'rgba(255, 255, 255, 0.35)',
              },
            ]}
            accessibilityLabel="Set mood"
          >
            <Text style={styles.moodEmoji}>{moodFace}</Text>
          </Pressable>
        </View>

        {prefs.showDefaultMoodHint && !entry.mood ? (
          <Text style={[styles.moodHint, { color: tokens.textSubtle }]}>
            Tap the face to set how your day felt
          </Text>
        ) : null}

        {/* Title */}
        <TextInput
          ref={titleRef}
          style={[styles.titleInput, { color: tokens.text }]}
          placeholder="Title"
          placeholderTextColor={tokens.textSubtle}
          value={entry.title}
          onChangeText={(t) => patch('title', t)}
          returnKeyType="next"
          onSubmitEditing={() => draftRef.current?.focus()}
        />

        {/* Write area — primary compose */}
        <TextInput
          ref={draftRef}
          style={[styles.bodyInput, { color: tokens.text }]}
          placeholder="Write more here..."
          placeholderTextColor={tokens.textSubtle}
          value={draft}
          onChangeText={(t) => {
            setDraft(t);
            setDraftNotice(false);
          }}
          multiline
          textAlignVertical="top"
          scrollEnabled={false}
        />

        {customLogTime ? (
          <Pressable onPress={() => setTimeOpen(true)}>
            <Text style={[styles.timeNote, { color: tokens.accent }]}>
              Next save timed for {formatPrefTime(customLogTime.toISOString(), prefs.timeFormat)} ·
              edit
            </Text>
          </Pressable>
        ) : null}

        {/* Optional sections revealed by toolbar */}
        {showPhotos || entry.photoIds.length > 0 ? (
          <PhotoGrid
            photoIds={entry.photoIds}
            onAdd={addPhoto}
            onDelete={deletePhoto}
            uploading={uploading}
          />
        ) : null}

        <VoiceNotes
          voiceIds={entry.voiceIds || []}
          recording={recording}
          recordingMs={recordingMs}
          uploading={uploadingVoice}
          onStopRecording={() => void stopVoiceNote()}
          onDelete={(id) => void deleteVoice(id)}
        />

        {showTags ? (
          <View style={styles.metaBlock}>
            <TagsEditor
              value={tagsText}
              onChange={(t) => {
                setTagsText(t);
                setDirty(true);
              }}
              inputRef={tagsRef}
            />
            <Text style={[styles.metaLabel, { color: tokens.textMuted }]}>People</Text>
            <TextInput
              style={[styles.metaField, { color: tokens.text, borderBottomColor: tokens.line }]}
              placeholder="names, comma separated"
              placeholderTextColor={tokens.textSubtle}
              value={peopleText}
              onChangeText={(t) => {
                setPeopleText(t);
                setDirty(true);
              }}
            />
          </View>
        ) : null}

        {logs.length > 0 ? (
          <View style={styles.momentsBlock}>
            <Pressable onPress={() => setShowLogs((v) => !v)} style={styles.momentsHeader}>
              <Text style={[styles.momentsTitle, { color: tokens.textMuted }]}>
                Moments today · {logs.length}
              </Text>
              <Text style={{ color: tokens.accent }}>{showLogs ? 'Hide' : 'Show'}</Text>
            </Pressable>
            {showLogs
              ? logs.map((log) => (
                  <Pressable
                    key={log.id}
                    style={[styles.logBlock, { borderTopColor: tokens.line }]}
                    onLongPress={() => removeLog(log.id)}
                  >
                    <Text style={[styles.logTime, { color: tokens.textMuted }]}>
                      {formatPrefTime(log.at, prefs.timeFormat)}
                    </Text>
                    <Text style={[styles.logText, { color: tokens.text }]}>{log.text}</Text>
                  </Pressable>
                ))
              : null}
          </View>
        ) : null}
      </ScrollView>

      <EditorToolStrip
        favorite={entry.favorite}
        recording={recording}
        tagsActive={showTags}
        legendColor={
          entry.legendId
            ? legendById(legends, entry.legendId)?.color ?? tokens.accent
            : null
        }
        onPress={onTool}
      />

      <MoodSheet
        visible={moodOpen}
        value={entry.mood}
        onClose={() => setMoodOpen(false)}
        onSelect={(m) => patch('mood', m)}
      />

      <DateTimePickerModal
        visible={timeOpen}
        dateKey={date}
        value={customLogTime ?? new Date()}
        onClose={() => setTimeOpen(false)}
        onConfirm={(d) => setCustomLogTime(d)}
      />

      <ActionSheet
        visible={!!daySheet}
        title={daySheet?.title ?? ''}
        message={daySheet?.message}
        actions={daySheet?.actions ?? []}
        onClose={closeSheet}
      />

      <Modal
        visible={dateSwitchOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDateSwitchOpen(false)}
      >
        <Pressable style={styles.modalDim} onPress={() => setDateSwitchOpen(false)}>
          <View
            style={[styles.dateSheet, { backgroundColor: tokens.bgElevated }]}
            onStartShouldSetResponder={() => true}
          >
            <SheetHeader title="Jump to day" onClose={() => setDateSwitchOpen(false)} />
            <View style={styles.dayNav}>
              <Pressable
                onPress={() => goToDate(shiftDateKey(date, -1))}
                style={[styles.navBtn, { borderColor: tokens.line }]}
              >
                <Text style={{ color: tokens.text }}>‹ Prev</Text>
              </Pressable>
              <Pressable
                onPress={() => goToDate(toDateKey())}
                style={[styles.navBtn, { borderColor: tokens.line }]}
              >
                <Text style={{ color: tokens.accent }}>Today</Text>
              </Pressable>
              <Pressable
                onPress={() => goToDate(shiftDateKey(date, 1))}
                style={[styles.navBtn, { borderColor: tokens.line }]}
              >
                <Text style={{ color: tokens.text }}>Next ›</Text>
              </Pressable>
            </View>
            <Calendar
              current={date}
              onDayPress={(day: DateData) => goToDate(day.dateString)}
              markedDates={{
                [date]: {
                  selected: true,
                  selectedColor: tokens.accent,
                  selectedTextColor: tokens.white,
                },
              }}
              theme={{
                backgroundColor: tokens.bgElevated,
                calendarBackground: tokens.bgElevated,
                dayTextColor: tokens.text,
                monthTextColor: tokens.text,
                arrowColor: tokens.accent,
                todayTextColor: tokens.fab,
                textDisabledColor: tokens.textSubtle,
                textSectionTitleColor: tokens.textMuted,
              }}
            />
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 32,
    flexGrow: 1,
  },
  headerIcon: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  backArrow: {
    fontSize: 24,
    fontFamily: fonts.body,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dots: {
    fontSize: 18,
    letterSpacing: 1,
    fontFamily: fonts.bodyMedium,
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    letterSpacing: 1,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    marginTop: spacing.xs,
  },
  dateBlock: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  dayNum: {
    fontFamily: fonts.display,
    fontSize: 42,
    lineHeight: 46,
    fontWeight: '600',
  },
  dayUnderline: {
    height: 3,
    width: '100%',
    marginTop: 2,
    borderRadius: 1,
  },
  monthYear: {
    fontFamily: fonts.body,
    fontSize: 18,
    marginBottom: 6,
  },
  moodCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodEmoji: {
    fontSize: 26,
  },
  moodHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: -8,
    marginBottom: spacing.md,
  },
  titleInput: {
    fontFamily: fonts.body,
    fontSize: 28,
    marginBottom: spacing.md,
    paddingVertical: 4,
  },
  bodyInput: {
    fontFamily: fonts.body,
    fontSize: 17,
    lineHeight: 26,
    minHeight: 200,
    paddingVertical: 4,
  },
  timeNote: {
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: spacing.sm,
  },
  draftBanner: {
    fontFamily: fonts.body,
    fontSize: 12,
    marginBottom: spacing.sm,
  },
  dirty: {
    fontFamily: fonts.body,
    fontSize: 11,
    marginTop: 6,
  },
  metaBlock: {
    marginTop: spacing.lg,
  },
  metaLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: spacing.md,
    marginBottom: 4,
  },
  metaField: {
    fontFamily: fonts.body,
    fontSize: 16,
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  momentsBlock: {
    marginTop: spacing.xl,
  },
  momentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  momentsTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  logBlock: {
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'flex-start',
  },
  logTime: {
    fontFamily: fonts.body,
    fontSize: 12,
    letterSpacing: 0.2,
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  logText: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
    alignSelf: 'stretch',
  },
  error: {
    fontFamily: fonts.body,
    marginBottom: spacing.sm,
  },
  modalDim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  dateSheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: 32,
  },
  sheetTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    marginBottom: spacing.md,
  },
  dayNav: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.md,
  },
  navBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
