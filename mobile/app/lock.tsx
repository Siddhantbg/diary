import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { Stack } from 'expo-router';
import { useSettings } from '@/context/SettingsContext';
import { useTheme } from '@/context/ThemeContext';
import { fonts, radius, spacing } from '@/constants/theme';
import { LockIcon } from '@/components/icons/LockIcon';
import { ActionSheet, SheetAction } from '@/components/ui/ActionSheet';
import { friendlyApiMessage } from '@/lib/api';

type ModalKind = 'password' | 'security' | 'email' | null;

/**
 * Set Diary Lock — toggle, password, security question, email, fingerprint.
 * PIN on device; hashed mirror + recovery metadata on API.
 */
export default function DiaryLockScreen() {
  const {
    config,
    enablePin,
    changePin,
    disablePin,
    setFingerprint,
    setSecurityQuestion,
    setRecoveryEmail,
    lock,
  } = useSettings();
  const { tokens, isDark } = useTheme();

  const [busy, setBusy] = useState(false);
  const [biometryOk, setBiometryOk] = useState(false);
  const [modal, setModal] = useState<ModalKind>(null);
  const [disableMode, setDisableMode] = useState(false);
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [email, setEmail] = useState('');
  const [sheet, setSheet] = useState<{
    title: string;
    message?: string;
    actions: SheetAction[];
  } | null>(null);

  const lockedOn = config.pinEnabled && config.hasPin;
  const muted = tokens.textMuted;
  const active = tokens.text;

  useEffect(() => {
    void (async () => {
      const hw = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometryOk(hw && enrolled);
    })();
  }, []);

  const notice = (title: string, message: string) =>
    setSheet({
      title,
      message,
      actions: [{ key: 'ok', label: 'Got it', icon: '✓', onPress: () => undefined }],
    });

  const help = () =>
    notice(
      'Diary Lock',
      'When enabled, MyDiary asks for your PIN (or fingerprint if on) each time you open the app. Recovery question and email help you reset a forgotten PIN. The PIN is stored securely on this device; a hashed copy and recovery details sync to your diary server.'
    );

  const clearForm = () => {
    setPin('');
    setPin2('');
    setCurrentPin('');
    setQuestion('');
    setAnswer('');
    setEmail('');
  };

  const run = async (work: () => Promise<void>, failTitle = 'Something went wrong') => {
    setBusy(true);
    try {
      await work();
      setModal(null);
      setDisableMode(false);
      clearForm();
    } catch (e: unknown) {
      notice(failTitle, e instanceof Error ? e.message : friendlyApiMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const openPassword = (forDisable = false) => {
    setDisableMode(forDisable);
    clearForm();
    setModal('password');
  };

  const onToggleLock = (on: boolean) => {
    if (busy) return;
    if (on) {
      openPassword(false);
      return;
    }
    openPassword(true);
  };

  const submitPassword = () =>
    run(async () => {
      if (disableMode) {
        if (pin.length < 4) throw new Error('Enter your current PIN');
        await disablePin(pin);
        notice('Lock disabled', 'Diary Lock is off on this device.');
        return;
      }
      if (lockedOn) {
        if (currentPin.length < 4) throw new Error('Enter your current PIN');
        if (!/^\d{4,8}$/.test(pin)) throw new Error('New PIN must be 4–8 digits');
        if (pin !== pin2) throw new Error('New PINs do not match');
        await changePin(currentPin, pin);
        notice('Password updated', 'Your diary PIN was changed.');
        return;
      }
      if (!/^\d{4,8}$/.test(pin)) throw new Error('PIN must be 4–8 digits');
      if (pin !== pin2) throw new Error('PINs do not match');
      await enablePin(pin);
      notice('Diary Lock on', 'Your diary is now protected with a PIN.');
    }, 'Could not set password');

  const submitSecurity = () =>
    run(async () => {
      if (currentPin.length < 4) throw new Error('Enter your current PIN');
      if (!question.trim() || !answer.trim()) throw new Error('Question and answer are required');
      await setSecurityQuestion(question.trim(), answer.trim(), currentPin);
      notice('Security question saved', 'You can use it to recover a forgotten PIN.');
    }, 'Could not save question');

  const submitEmail = () =>
    run(async () => {
      if (currentPin.length < 4) throw new Error('Enter your current PIN');
      const e = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new Error('Enter a valid email address');
      await setRecoveryEmail(e, currentPin);
      notice('Email saved', 'Stored for password recovery. It is never used for other data collection.');
    }, 'Could not save email');

  const onFingerprint = async (on: boolean) => {
    if (!lockedOn) return;
    if (on) {
      if (!biometryOk) {
        notice(
          'Fingerprint unavailable',
          'This device has no biometric hardware enrolled. Set one up in system settings first.'
        );
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Enable fingerprint unlock',
        fallbackLabel: 'Use PIN',
      });
      if (!result.success) return;
    }
    await run(async () => {
      await setFingerprint(on);
    }, 'Could not update fingerprint');
  };

  return (
    <View style={[styles.screen, { backgroundColor: tokens.bg }]}>
      <Stack.Screen
        options={{
          title: 'Set Diary Lock',
          headerBackTitle: 'Back',
          headerRight: () => (
            <Pressable onPress={help} hitSlop={12} accessibilityLabel="Help">
              <View style={[styles.helpBubble, { backgroundColor: tokens.accent }]}>
                <Text style={styles.helpGlyph}>?</Text>
              </View>
            </Pressable>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <LockIcon color={tokens.accent} variant={isDark ? 'dark' : 'light'} size={40} />
        </View>

        <Row
          title="Diary Lock"
          subtitle="Set a password to protect your diary."
          titleColor={active}
          subColor={muted}
          line={tokens.line}
          right={
            <Switch
              value={lockedOn}
              onValueChange={onToggleLock}
              disabled={busy}
              trackColor={{ false: tokens.line, true: tokens.accent }}
              thumbColor="#FFFFFF"
            />
          }
        />

        <Row
          title="Set Password"
          subtitle="Set or change your password."
          titleColor={lockedOn ? active : muted}
          subColor={muted}
          line={tokens.line}
          dimmed={!lockedOn}
          onPress={lockedOn ? () => openPassword(false) : undefined}
        />

        <Row
          title="Set Security Question"
          subtitle="It will be used to get back your password"
          titleColor={lockedOn ? active : muted}
          subColor={muted}
          line={tokens.line}
          dimmed={!lockedOn}
          onPress={
            lockedOn
              ? () => {
                  clearForm();
                  setQuestion(config.securityQuestion || '');
                  setModal('security');
                }
              : undefined
          }
          trailing={
            config.hasSecurityQuestion && lockedOn ? (
              <Text style={{ color: tokens.accent, fontSize: 12, fontFamily: fonts.body }}>Set</Text>
            ) : null
          }
        />

        <Row
          title="Set Email Address"
          subtitle="Please add an email address for password recovery. It will only be used to send recovery emails and will not access or collect any other personal data."
          titleColor={lockedOn ? active : muted}
          subColor={muted}
          line={tokens.line}
          dimmed={!lockedOn}
          onPress={
            lockedOn
              ? () => {
                  clearForm();
                  setEmail(config.recoveryEmail || '');
                  setModal('email');
                }
              : undefined
          }
          trailing={
            config.hasEmail && lockedOn ? (
              <Text style={{ color: tokens.accent, fontSize: 12, fontFamily: fonts.body }}>On</Text>
            ) : null
          }
        />

        <Row
          title="Enable Fingerprint"
          subtitle={
            biometryOk
              ? 'Unlock with fingerprint or face when available'
              : 'Biometrics not enrolled on this device'
          }
          titleColor={lockedOn ? active : muted}
          subColor={muted}
          line={tokens.line}
          dimmed={!lockedOn}
          right={
            <Switch
              value={lockedOn && config.fingerprintEnabled}
              onValueChange={(v) => void onFingerprint(v)}
              disabled={!lockedOn || busy}
              trackColor={{ false: tokens.line, true: tokens.accent }}
              thumbColor="#FFFFFF"
            />
          }
        />

        {lockedOn ? (
          <Pressable onPress={lock} style={[styles.lockNow, { backgroundColor: tokens.accent }]}>
            <Text style={styles.lockNowText}>Lock diary now</Text>
          </Pressable>
        ) : null}

        {busy ? (
          <ActivityIndicator color={tokens.accent} style={{ marginTop: spacing.lg }} />
        ) : null}
      </ScrollView>

      <Modal
        visible={modal === 'password'}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setModal(null);
          setDisableMode(false);
        }}
      >
        <Pressable
          style={styles.dim}
          onPress={() => {
            setModal(null);
            setDisableMode(false);
          }}
        >
          <View
            style={[styles.sheet, { backgroundColor: tokens.bgElevated, borderColor: tokens.line }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.sheetHead}>
              <LockIcon color={tokens.text} variant={isDark ? 'dark' : 'light'} size={24} />
              <Text style={[styles.sheetTitle, { color: tokens.text, marginBottom: 0 }]}>
                {disableMode ? 'Disable lock' : lockedOn ? 'Change password' : 'Set password'}
              </Text>
            </View>

            {disableMode ? (
              <TextInput
                style={[styles.input, { color: tokens.text, borderBottomColor: tokens.line }]}
                value={pin}
                onChangeText={setPin}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={8}
                placeholder="Current PIN"
                placeholderTextColor={tokens.textSubtle}
              />
            ) : lockedOn ? (
              <>
                <TextInput
                  style={[styles.input, { color: tokens.text, borderBottomColor: tokens.line }]}
                  value={currentPin}
                  onChangeText={setCurrentPin}
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={8}
                  placeholder="Current PIN"
                  placeholderTextColor={tokens.textSubtle}
                />
                <TextInput
                  style={[styles.input, { color: tokens.text, borderBottomColor: tokens.line }]}
                  value={pin}
                  onChangeText={setPin}
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={8}
                  placeholder="New PIN (4–8 digits)"
                  placeholderTextColor={tokens.textSubtle}
                />
                <TextInput
                  style={[styles.input, { color: tokens.text, borderBottomColor: tokens.line }]}
                  value={pin2}
                  onChangeText={setPin2}
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={8}
                  placeholder="Confirm PIN"
                  placeholderTextColor={tokens.textSubtle}
                />
              </>
            ) : (
              <>
                <TextInput
                  style={[styles.input, { color: tokens.text, borderBottomColor: tokens.line }]}
                  value={pin}
                  onChangeText={setPin}
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={8}
                  placeholder="PIN (4–8 digits)"
                  placeholderTextColor={tokens.textSubtle}
                />
                <TextInput
                  style={[styles.input, { color: tokens.text, borderBottomColor: tokens.line }]}
                  value={pin2}
                  onChangeText={setPin2}
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={8}
                  placeholder="Confirm PIN"
                  placeholderTextColor={tokens.textSubtle}
                />
              </>
            )}

            <View style={styles.sheetActions}>
              <Pressable
                onPress={() => {
                  setModal(null);
                  setDisableMode(false);
                }}
              >
                <Text style={{ color: tokens.textMuted, fontFamily: fonts.body }}>Cancel</Text>
              </Pressable>
              <Pressable onPress={() => void submitPassword()}>
                <Text style={{ color: tokens.accent, fontFamily: fonts.bodyMedium }}>
                  {disableMode ? 'Disable' : 'Save'}
                </Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={modal === 'security'} transparent animationType="fade" onRequestClose={() => setModal(null)}>
        <Pressable style={styles.dim} onPress={() => setModal(null)}>
          <View
            style={[styles.sheet, { backgroundColor: tokens.bgElevated, borderColor: tokens.line }]}
            onStartShouldSetResponder={() => true}
          >
            <Text style={[styles.sheetTitle, { color: tokens.text }]}>Security question</Text>
            <TextInput
              style={[styles.input, { color: tokens.text, borderBottomColor: tokens.line }]}
              value={currentPin}
              onChangeText={setCurrentPin}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={8}
              placeholder="Current PIN"
              placeholderTextColor={tokens.textSubtle}
            />
            <TextInput
              style={[styles.input, { color: tokens.text, borderBottomColor: tokens.line }]}
              value={question}
              onChangeText={setQuestion}
              placeholder="e.g. First pet's name?"
              placeholderTextColor={tokens.textSubtle}
            />
            <TextInput
              style={[styles.input, { color: tokens.text, borderBottomColor: tokens.line }]}
              value={answer}
              onChangeText={setAnswer}
              placeholder="Answer"
              placeholderTextColor={tokens.textSubtle}
              autoCapitalize="none"
            />
            <View style={styles.sheetActions}>
              <Pressable onPress={() => setModal(null)}>
                <Text style={{ color: tokens.textMuted, fontFamily: fonts.body }}>Cancel</Text>
              </Pressable>
              <Pressable onPress={() => void submitSecurity()}>
                <Text style={{ color: tokens.accent, fontFamily: fonts.bodyMedium }}>Save</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={modal === 'email'} transparent animationType="fade" onRequestClose={() => setModal(null)}>
        <Pressable style={styles.dim} onPress={() => setModal(null)}>
          <View
            style={[styles.sheet, { backgroundColor: tokens.bgElevated, borderColor: tokens.line }]}
            onStartShouldSetResponder={() => true}
          >
            <Text style={[styles.sheetTitle, { color: tokens.text }]}>Recovery email</Text>
            <TextInput
              style={[styles.input, { color: tokens.text, borderBottomColor: tokens.line }]}
              value={currentPin}
              onChangeText={setCurrentPin}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={8}
              placeholder="Current PIN"
              placeholderTextColor={tokens.textSubtle}
            />
            <TextInput
              style={[styles.input, { color: tokens.text, borderBottomColor: tokens.line }]}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="you@example.com"
              placeholderTextColor={tokens.textSubtle}
            />
            <View style={styles.sheetActions}>
              <Pressable onPress={() => setModal(null)}>
                <Text style={{ color: tokens.textMuted, fontFamily: fonts.body }}>Cancel</Text>
              </Pressable>
              <Pressable onPress={() => void submitEmail()}>
                <Text style={{ color: tokens.accent, fontFamily: fonts.bodyMedium }}>Save</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      <ActionSheet
        visible={!!sheet}
        title={sheet?.title ?? ''}
        message={sheet?.message}
        actions={sheet?.actions ?? []}
        onClose={() => setSheet(null)}
      />
    </View>
  );
}

type RowProps = {
  title: string;
  subtitle: string;
  titleColor: string;
  subColor: string;
  line: string;
  right?: React.ReactNode;
  trailing?: React.ReactNode;
  onPress?: () => void;
  dimmed?: boolean;
};

function Row({ title, subtitle, titleColor, subColor, line, right, trailing, onPress, dimmed }: RowProps) {
  const body = (
    <View style={[styles.row, { borderBottomColor: line, opacity: dimmed ? 0.45 : 1 }]}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={[styles.rowTitle, { color: titleColor }]}>{title}</Text>
        <Text style={[styles.rowSub, { color: subColor }]}>{subtitle}</Text>
      </View>
      {trailing}
      {right}
    </View>
  );
  if (onPress) {
    return <Pressable onPress={onPress}>{body}</Pressable>;
  }
  return body;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 48,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  rowTitle: {
    fontFamily: fonts.body,
    fontSize: 16,
    marginBottom: 4,
  },
  rowSub: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  lockNow: {
    marginTop: spacing.xl,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  lockNowText: {
    color: '#FFFFFF',
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
  },
  helpBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  helpGlyph: {
    color: '#FFFFFF',
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
  },
  dim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: spacing.md,
  },
  sheetTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    marginBottom: spacing.sm,
  },
  input: {
    fontFamily: fonts.body,
    fontSize: 16,
    borderBottomWidth: 1,
    paddingVertical: 10,
    marginBottom: spacing.md,
  },
  sheetActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 24,
    marginTop: spacing.sm,
  },
});
