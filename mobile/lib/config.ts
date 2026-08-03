import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { API_SECRET, API_URL } from '@/lib/env';

const PIN_KEY = 'diary_pin';
const PIN_ENABLED_KEY = 'diary_pin_enabled';

export type AppConfig = {
  apiUrl: string;
  apiSecret: string;
  pinEnabled: boolean;
  hasPin: boolean;
};

export async function loadConfig(): Promise<AppConfig> {
  const [pinEnabled, pin] = await Promise.all([
    AsyncStorage.getItem(PIN_ENABLED_KEY),
    SecureStore.getItemAsync(PIN_KEY),
  ]);

  return {
    apiUrl: API_URL,
    apiSecret: API_SECRET,
    pinEnabled: pinEnabled === '1',
    hasPin: !!pin,
  };
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
