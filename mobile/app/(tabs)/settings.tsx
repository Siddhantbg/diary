import React, { useEffect, useState } from 'react';
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
  const {
    config,
    updateApiUrl,
    updateApiSecret,
    enablePin,
    disablePin,
    lock,
    api,
  } = useSettings();

  const [apiUrl, setApiUrl] = useState(config.apiUrl);
  const [apiSecret, setApiSecret] = useState(config.apiSecret);
  const [pin, setPin] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    setApiUrl(config.apiUrl);
    setApiSecret(config.apiSecret);
  }, [config.apiUrl, config.apiSecret]);

  const saveConnection = async () => {
    await updateApiUrl(apiUrl.trim());
    await updateApiSecret(apiSecret.trim());
    setStatus('Saved connection settings.');
  };

  const testConnection = async () => {
    try {
      const url = apiUrl.trim().replace(/\/$/, '');
      const res = await fetch(`${url}/health`);
      const data = await res.json();
      setStatus(`Health: ${data.ok ? 'ok' : 'fail'} · mongo: ${data.mongo}`);
      if (api) {
        await api.listEntries(1);
        setStatus((s) => `${s} · auth: ok`);
      }
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
      <Text style={styles.section}>API connection</Text>
      <Text style={styles.help}>
        Local testing: use your PC LAN IP, e.g. http://192.168.1.10:4000. After Render deploy, paste
        the https URL here.
      </Text>
      <Text style={styles.label}>API URL</Text>
      <TextInput
        style={styles.input}
        value={apiUrl}
        onChangeText={setApiUrl}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="http://192.168.x.x:4000"
        placeholderTextColor={colors.inkMuted}
      />
      <Text style={styles.label}>API secret</Text>
      <TextInput
        style={styles.input}
        value={apiSecret}
        onChangeText={setApiSecret}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        placeholder="Same as server API_SECRET"
        placeholderTextColor={colors.inkMuted}
      />
      <View style={styles.row}>
        <Pressable style={styles.btn} onPress={saveConnection}>
          <Text style={styles.btnText}>Save</Text>
        </Pressable>
        <Pressable style={[styles.btn, styles.btnGhost]} onPress={testConnection}>
          <Text style={[styles.btnText, styles.btnGhostText]}>Test</Text>
        </Pressable>
      </View>
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
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 4,
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
