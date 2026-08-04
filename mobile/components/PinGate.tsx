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
import { useTheme } from '@/context/ThemeContext';
import { fonts, spacing } from '@/constants/theme';
import { MyDiaryTitle } from '@/components/brand/DiaryMark';
import { LockIcon } from '@/components/icons/LockIcon';

export function PinGate({ children }: { children: React.ReactNode }) {
  const { ready, config, unlocked, unlockWithPin, unlock, recoverWithAnswer, api } =
    useSettings();
  const { tokens, isDark } = useTheme();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [newPin, setNewPin] = useState('');
  const [newPin2, setNewPin2] = useState('');

  useEffect(() => {
    if (!ready || unlocked || !config.pinEnabled) return;
    if (!config.fingerprintEnabled) return;

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
  }, [ready, unlocked, config.pinEnabled, config.fingerprintEnabled, unlock]);

  useEffect(() => {
    if (!ready || unlocked || !config.pinEnabled || !recovering) return;
    const localQ = config.securityQuestion;
    if (localQ) {
      setQuestion(localQ);
      return;
    }
    void (async () => {
      try {
        const remote = await api.getLock();
        if (remote.securityQuestion) setQuestion(remote.securityQuestion);
      } catch {
        // offline
      }
    })();
  }, [ready, unlocked, config.pinEnabled, config.securityQuestion, recovering, api]);

  if (!ready) {
    return (
      <View style={[styles.center, { backgroundColor: tokens.bg }]}>
        <ActivityIndicator color={tokens.accent} />
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

  const submitRecover = async () => {
    setBusy(true);
    setError('');
    if (!answer.trim()) {
      setError('Enter your security answer');
      setBusy(false);
      return;
    }
    if (!/^\d{4,8}$/.test(newPin)) {
      setError('New PIN must be 4–8 digits');
      setBusy(false);
      return;
    }
    if (newPin !== newPin2) {
      setError('New PINs do not match');
      setBusy(false);
      return;
    }
    const ok = await recoverWithAnswer(answer, newPin);
    setBusy(false);
    if (!ok) {
      setError('Incorrect answer or recovery failed');
      return;
    }
    setRecovering(false);
    setAnswer('');
    setNewPin('');
    setNewPin2('');
  };

  if (recovering) {
    return (
      <View style={[styles.center, { backgroundColor: tokens.bg }]}>
        <LockIcon color={tokens.accent} variant={isDark ? 'dark' : 'light'} size={36} />
        <Text style={[styles.title, { color: tokens.text }]}>Forgot PIN</Text>
        <Text style={[styles.sub, { color: tokens.textMuted }]}>
          {question
            ? question
            : 'Answer your security question to set a new PIN. If you never set one, recovery is not available on this device.'}
        </Text>
        {question ? (
          <>
            <TextInput
              style={[styles.inputText, { borderBottomColor: tokens.accent, color: tokens.text }]}
              value={answer}
              onChangeText={setAnswer}
              placeholder="Answer"
              placeholderTextColor={tokens.textSubtle}
              autoCapitalize="none"
            />
            <TextInput
              style={[styles.input, { borderBottomColor: tokens.accent, color: tokens.text }]}
              value={newPin}
              onChangeText={setNewPin}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={8}
              placeholder="New PIN"
              placeholderTextColor={tokens.textSubtle}
            />
            <TextInput
              style={[styles.input, { borderBottomColor: tokens.accent, color: tokens.text }]}
              value={newPin2}
              onChangeText={setNewPin2}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={8}
              placeholder="Confirm PIN"
              placeholderTextColor={tokens.textSubtle}
            />
          </>
        ) : null}
        {!!error && <Text style={[styles.error, { color: tokens.danger }]}>{error}</Text>}
        {question ? (
          <Pressable
            style={[styles.button, { backgroundColor: tokens.fab }]}
            onPress={() => void submitRecover()}
            disabled={busy}
          >
            <Text style={styles.buttonText}>{busy ? '…' : 'Reset PIN'}</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={() => { setRecovering(false); setError(''); }} style={{ marginTop: 16 }}>
          <Text style={{ color: tokens.textMuted, fontFamily: fonts.body }}>Back to PIN</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.center, { backgroundColor: tokens.bg }]}>
      <View style={styles.brandWrap}>
        <MyDiaryTitle color={tokens.text} fontSize={36} markSize={56} />
      </View>
      <Text style={[styles.sub, { color: tokens.textMuted }]}>
        {"Enter your PIN to open today's pages"}
      </Text>
      <TextInput
        style={[styles.input, { borderBottomColor: tokens.accent, color: tokens.text }]}
        value={pin}
        onChangeText={setPin}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={8}
        placeholder="PIN"
        placeholderTextColor={tokens.textSubtle}
        onSubmitEditing={() => void submit()}
      />
      {!!error && <Text style={[styles.error, { color: tokens.danger }]}>{error}</Text>}
      <Pressable
        style={[styles.button, { backgroundColor: tokens.fab }]}
        onPress={() => void submit()}
        disabled={busy || pin.length < 4}
      >
        <Text style={styles.buttonText}>{busy ? '…' : 'Unlock'}</Text>
      </Pressable>
      <Pressable
        onPress={() => {
          setError('');
          setRecovering(true);
        }}
        style={{ marginTop: spacing.lg }}
      >
        <Text style={{ color: tokens.accent, fontFamily: fonts.body }}>Forgot PIN?</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  brandWrap: {
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 22,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  sub: {
    fontFamily: fonts.body,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  input: {
    width: '70%',
    borderBottomWidth: 1.5,
    fontFamily: fonts.bodyMedium,
    fontSize: 28,
    letterSpacing: 8,
    textAlign: 'center',
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  inputText: {
    width: '85%',
    borderBottomWidth: 1.5,
    fontFamily: fonts.body,
    fontSize: 16,
    textAlign: 'center',
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  button: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
    borderRadius: 8,
    marginTop: spacing.sm,
  },
  buttonText: {
    color: '#FFFFFF',
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
  },
  error: {
    fontFamily: fonts.body,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
});
