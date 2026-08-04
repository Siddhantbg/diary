import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { API_SECRET, API_URL } from '@/lib/env';

const PIN_KEY = 'diary_pin';
const PIN_ENABLED_KEY = 'diary_pin_enabled';
const FINGERPRINT_KEY = 'diary_fingerprint_enabled';
const SECURITY_Q_KEY = 'diary_security_question';
const SECURITY_A_KEY = 'diary_security_answer';
const RECOVERY_EMAIL_KEY = 'diary_recovery_email';

export type AppConfig = {
  apiUrl: string;
  apiSecret: string;
  pinEnabled: boolean;
  hasPin: boolean;
  fingerprintEnabled: boolean;
  hasSecurityQuestion: boolean;
  securityQuestion: string;
  hasEmail: boolean;
  recoveryEmail: string;
};

export async function loadConfig(): Promise<AppConfig> {
  const [pinEnabled, pin, fingerprint, question, answer, email] = await Promise.all([
    AsyncStorage.getItem(PIN_ENABLED_KEY),
    SecureStore.getItemAsync(PIN_KEY),
    AsyncStorage.getItem(FINGERPRINT_KEY),
    AsyncStorage.getItem(SECURITY_Q_KEY),
    SecureStore.getItemAsync(SECURITY_A_KEY),
    AsyncStorage.getItem(RECOVERY_EMAIL_KEY),
  ]);

  return {
    apiUrl: API_URL,
    apiSecret: API_SECRET,
    pinEnabled: pinEnabled === '1',
    hasPin: !!pin,
    fingerprintEnabled: fingerprint === '1',
    hasSecurityQuestion: !!(question && answer),
    securityQuestion: question || '',
    hasEmail: !!email,
    recoveryEmail: email || '',
  };
}

export async function savePin(pin: string) {
  await SecureStore.setItemAsync(PIN_KEY, pin);
  await AsyncStorage.setItem(PIN_ENABLED_KEY, '1');
}

export async function clearPin() {
  await SecureStore.deleteItemAsync(PIN_KEY);
  await AsyncStorage.setItem(PIN_ENABLED_KEY, '0');
  await AsyncStorage.setItem(FINGERPRINT_KEY, '0');
}

export async function verifyPin(candidate: string): Promise<boolean> {
  const pin = await SecureStore.getItemAsync(PIN_KEY);
  return !!pin && pin === candidate;
}

export async function setFingerprintEnabled(on: boolean) {
  await AsyncStorage.setItem(FINGERPRINT_KEY, on ? '1' : '0');
}

export async function saveSecurityQuestion(question: string, answer: string) {
  await AsyncStorage.setItem(SECURITY_Q_KEY, question.trim());
  await SecureStore.setItemAsync(SECURITY_A_KEY, answer.trim().toLowerCase());
}

export async function clearSecurityQuestion() {
  await AsyncStorage.removeItem(SECURITY_Q_KEY);
  await SecureStore.deleteItemAsync(SECURITY_A_KEY);
}

export async function verifySecurityAnswer(candidate: string): Promise<boolean> {
  const ans = await SecureStore.getItemAsync(SECURITY_A_KEY);
  return !!ans && ans === candidate.trim().toLowerCase();
}

export async function saveRecoveryEmail(email: string) {
  await AsyncStorage.setItem(RECOVERY_EMAIL_KEY, email.trim().toLowerCase());
}

export async function clearRecoveryEmail() {
  await AsyncStorage.removeItem(RECOVERY_EMAIL_KEY);
}
