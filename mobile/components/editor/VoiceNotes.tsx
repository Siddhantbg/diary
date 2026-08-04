import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Audio } from 'expo-av';
import { useSettings } from '@/context/SettingsContext';
import { useTheme } from '@/context/ThemeContext';
import { ActionSheet } from '@/components/ui/ActionSheet';
import { fonts, spacing } from '@/constants/theme';

type Props = {
  voiceIds: string[];
  recording: boolean;
  recordingMs: number;
  uploading: boolean;
  onStopRecording: () => void;
  onDelete: (id: string) => void;
};

function formatMs(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function VoiceNotes({
  voiceIds,
  recording,
  recordingMs,
  uploading,
  onStopRecording,
  onDelete,
}: Props) {
  const { tokens } = useTheme();
  const { api } = useSettings();
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ title: string; message: string } | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    return () => {
      void soundRef.current?.unloadAsync();
      soundRef.current = null;
    };
  }, []);

  const stopPlayback = async () => {
    try {
      await soundRef.current?.stopAsync();
      await soundRef.current?.unloadAsync();
    } catch {
      // ignore
    }
    soundRef.current = null;
    setPlayingId(null);
  };

  const play = async (id: string) => {
    if (!api) return;
    if (playingId === id) {
      await stopPlayback();
      return;
    }
    await stopPlayback();
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });
      const { sound } = await Audio.Sound.createAsync(
        { uri: api.voiceUrl(id) },
        { shouldPlay: true }
      );
      soundRef.current = sound;
      setPlayingId(id);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) return;
        if (status.didJustFinish) {
          void stopPlayback();
        }
      });
    } catch (e: unknown) {
      setNotice({
        title: 'Playback',
        message: e instanceof Error ? e.message : 'Could not play voice note',
      });
      setPlayingId(null);
    }
  };

  const confirmDelete = (id: string) => {
    setPendingDeleteId(id);
    setSheetOpen(true);
  };

  if (!recording && !uploading && voiceIds.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.heading, { color: tokens.textMuted }]}>Voice notes</Text>

      {recording ? (
        <Pressable
          onPress={onStopRecording}
          style={[styles.recBar, { backgroundColor: 'rgba(220, 60, 60, 0.14)', borderColor: tokens.danger }]}
        >
          <View style={[styles.recDot, { backgroundColor: tokens.danger }]} />
          <Text style={[styles.recText, { color: tokens.text }]}>
            Recording {formatMs(recordingMs)}
          </Text>
          <Text style={[styles.recAction, { color: tokens.danger }]}>Tap to stop</Text>
        </Pressable>
      ) : null}

      {uploading ? (
        <View style={styles.row}>
          <ActivityIndicator color={tokens.accent} size="small" />
          <Text style={[styles.meta, { color: tokens.textSubtle }]}>Saving voice note…</Text>
        </View>
      ) : null}

      {voiceIds.map((id, index) => {
        const active = playingId === id;
        return (
          <View
            key={id}
            style={[styles.noteRow, { borderTopColor: tokens.line }]}
          >
            <Pressable
              onPress={() => play(id)}
              style={[styles.playBtn, { backgroundColor: tokens.accentSoft }]}
              accessibilityLabel={active ? 'Pause' : 'Play voice note'}
            >
              <Text style={styles.playIcon}>{active ? '⏸' : '▶'}</Text>
            </Pressable>
            <View style={styles.noteBody}>
              <Text style={[styles.noteTitle, { color: tokens.text }]}>
                Note {index + 1}
              </Text>
              <Text style={[styles.meta, { color: tokens.textSubtle }]}>
                {active ? 'Playing…' : 'Tap play to listen'}
              </Text>
            </View>
            <Pressable onPress={() => confirmDelete(id)} hitSlop={10} accessibilityLabel="Delete">
              <Text style={{ color: tokens.danger, fontSize: 16 }}>⌫</Text>
            </Pressable>
          </View>
        );
      })}

      <ActionSheet
        visible={sheetOpen}
        title="Delete voice note?"
        message="This cannot be undone."
        onClose={() => setSheetOpen(false)}
        actions={[
          {
            key: 'delete',
            label: 'Delete note',
            icon: '⌫',
            destructive: true,
            onPress: async () => {
              const id = pendingDeleteId;
              setPendingDeleteId(null);
              if (!id) return;
              if (playingId === id) await stopPlayback();
              onDelete(id);
            },
          },
          {
            key: 'keep',
            label: 'Keep note',
            icon: '↩',
            cancel: true,
            onPress: () => setPendingDeleteId(null),
          },
        ]}
      />

      <ActionSheet
        visible={!!notice}
        title={notice?.title ?? ''}
        message={notice?.message}
        onClose={() => setNotice(null)}
        actions={[
          { key: 'ok', label: 'Got it', icon: '✓', onPress: () => undefined },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.lg,
    gap: 8,
  },
  heading: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  recBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  recDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  recText: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
  },
  recAction: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  playBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    fontSize: 14,
  },
  noteBody: {
    flex: 1,
    gap: 2,
  },
  noteTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: 12,
  },
});
