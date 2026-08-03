import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const API_URL_KEY = 'diary_api_url';
const API_SECRET_KEY = 'diary_api_secret';
const PIN_KEY = 'diary_pin';
const PIN_ENABLED_KEY = 'diary_pin_enabled';

const DEFAULT_API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

export type AppConfig = {
  apiUrl: string;
  apiSecret: string;
  pinEnabled: boolean;
  hasPin: boolean;
};

export async function loadConfig(): Promise<AppConfig> {
  const [apiUrl, apiSecret, pinEnabled, pin] = await Promise.all([
    AsyncStorage.getItem(API_URL_KEY),
    SecureStore.getItemAsync(API_SECRET_KEY),
    AsyncStorage.getItem(PIN_ENABLED_KEY),
    SecureStore.getItemAsync(PIN_KEY),
  ]);

  return {
    apiUrl: (apiUrl || DEFAULT_API_URL).replace(/\/$/, ''),
    apiSecret: apiSecret || '',
    pinEnabled: pinEnabled === '1',
    hasPin: !!pin,
  };
}

export async function saveApiUrl(url: string) {
  await AsyncStorage.setItem(API_URL_KEY, url.replace(/\/$/, ''));
}

export async function saveApiSecret(secret: string) {
  await SecureStore.setItemAsync(API_SECRET_KEY, secret);
}

export async function savePin(pin: string) {
  await SecureStore.setItemAsync(PIN_KEY, pin);
  await AsyncStorage.setItem(PIN_ENABLED_KEY, '1');
}

export async function clearPin() {
  await SecureStore.deleteItemAsync(PIN_KEY);
  await AsyncStorage.setItem(PIN_ENABLED_KEY, '0');
}

export async function verifyPin(candidate: string): Promise<boolean> {
  const pin = await SecureStore.getItemAsync(PIN_KEY);
  return !!pin && pin === candidate;
}

export async function setPinEnabled(enabled: boolean) {
  await AsyncStorage.setItem(PIN_ENABLED_KEY, enabled ? '1' : '0');
}
