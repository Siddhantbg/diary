import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSettings } from '@/context/SettingsContext';
import { colors, fonts, spacing } from '@/constants/theme';

export default function SettingsScreen() {
  const { config, enablePin, disablePin, lock, api } = useSettings();
  const [pin, setPin] = useState('');
  const [status, setStatus] = useState('');

  const testConnection = async () => {
    try {
      const res = await fetch(`${config.apiUrl}/health`);
      const data = await res.json();
      await api.listEntries(1);
      setStatus(`Connected · mongo: ${data.mongo}`);
    } catch (e: unknown) {
      setStatus(e instanceof Error ? e.message : 'Connection failed');
    }
  };

  const onEnablePin = async () => {
    if (pin.length < 4) {
      Alert.alert('PIN too short', 'Use at least 4 digits.');
      return;
    }
    await enablePin(pin);
    setPin('');
    setStatus('PIN enabled.');
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.section}>Connection</Text>
      <Text style={styles.help}>
        API is wired in the app automatically. No keys to paste here.
      </Text>
      <Pressable style={styles.btn} onPress={testConnection}>
        <Text style={styles.btnText}>Test connection</Text>
      </Pressable>
      {!!status && <Text style={styles.status}>{status}</Text>}

      <Text style={[styles.section, { marginTop: spacing.xl }]}>Privacy lock</Text>
      <Text style={styles.help}>Optional PIN (and biometric when available) when opening the app.</Text>
      {config.pinEnabled ? (
        <View style={styles.row}>
          <Pressable style={styles.btn} onPress={lock}>
            <Text style={styles.btnText}>Lock now</Text>
          </Pressable>
          <Pressable
            style={[styles.btn, styles.btnGhost]}
            onPress={() =>
              Alert.alert('Disable PIN?', 'Anyone with the phone can open the diary.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Disable', style: 'destructive', onPress: () => disablePin() },
              ])
            }
          >
            <Text style={[styles.btnText, styles.btnGhostText]}>Disable PIN</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <TextInput
            style={styles.input}
            value={pin}
            onChangeText={setPin}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={8}
            placeholder="Choose a 4–8 digit PIN"
            placeholderTextColor={colors.inkMuted}
          />
          <Pressable style={styles.btn} onPress={onEnablePin}>
            <Text style={styles.btnText}>Enable PIN</Text>
          </Pressable>
        </>
      )}

      <Text style={[styles.section, { marginTop: spacing.xl }]}>About</Text>
      <Text style={styles.help}>
        Personal Memory Diary · Expo + Express + MongoDB Atlas. Photos live in GridFS so Render
        deploys keep your memories.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: spacing.lg, paddingBottom: 48 },
  section: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  help: {
    fontFamily: fonts.body,
    color: colors.inkMuted,
    marginBottom: spacing.md,
    lineHeight: 22,
  },
  input: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingVertical: 10,
    marginBottom: spacing.md,
  },
  row: { flexDirection: 'row', gap: 10, marginBottom: spacing.sm },
  btn: {
    backgroundColor: colors.leaf,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignSelf: 'flex-start',
  },
  btnText: {
    color: colors.white,
    fontFamily: fonts.bodyMedium,
  },
  btnGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.leaf,
  },
  btnGhostText: { color: colors.leaf },
  status: {
    fontFamily: fonts.body,
    color: colors.inkMuted,
    marginTop: spacing.sm,
  },
});
