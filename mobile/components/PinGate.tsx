import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useSettings } from '@/context/SettingsContext';
import { colors, fonts, spacing } from '@/constants/theme';

export function PinGate({ children }: { children: React.ReactNode }) {
  const { ready, config, unlocked, unlockWithPin, unlock } = useSettings();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ready || unlocked || !config.pinEnabled) return;

    (async () => {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !enrolled) return;
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Diary',
        fallbackLabel: 'Use PIN',
        disableDeviceFallback: false,
      });
      if (result.success) unlock();
    })();
  }, [ready, unlocked, config.pinEnabled, unlock]);

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.leaf} />
      </View>
    );
  }

  if (!config.pinEnabled || unlocked) {
    return <>{children}</>;
  }

  const submit = async () => {
    setBusy(true);
    setError('');
    const ok = await unlockWithPin(pin);
    setBusy(false);
    if (!ok) {
      setError('Incorrect PIN');
      setPin('');
    }
  };

  return (
    <View style={styles.center}>
      <Text style={styles.brand}>Diary</Text>
      <Text style={styles.sub}>Enter your PIN to open today&apos;s pages</Text>
      <TextInput
        style={styles.input}
        value={pin}
        onChangeText={setPin}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={8}
        placeholder="PIN"
        placeholderTextColor={colors.inkMuted}
        onSubmitEditing={submit}
      />
      {!!error && <Text style={styles.error}>{error}</Text>}
      <Pressable style={styles.button} onPress={submit} disabled={busy || pin.length < 4}>
        <Text style={styles.buttonText}>{busy ? '…' : 'Unlock'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.paper,
    padding: spacing.lg,
  },
  brand: {
    fontFamily: fonts.display,
    fontSize: 42,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  sub: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.inkMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  input: {
    width: '70%',
    borderBottomWidth: 1.5,
    borderBottomColor: colors.leaf,
    fontFamily: fonts.bodyMedium,
    fontSize: 28,
    letterSpacing: 8,
    textAlign: 'center',
    color: colors.ink,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  button: {
    backgroundColor: colors.leaf,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
    borderRadius: 8,
    marginTop: spacing.sm,
  },
  buttonText: {
    color: colors.white,
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
  },
  error: {
    color: colors.danger,
    fontFamily: fonts.body,
    marginBottom: spacing.sm,
  },
});
