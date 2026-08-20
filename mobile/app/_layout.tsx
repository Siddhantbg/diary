import {
  Montserrat_400Regular_Italic,
  Montserrat_600SemiBold,
  useFonts,
} from '@expo-google-fonts/montserrat';
import {
  Poppins_400Regular,
  Poppins_600SemiBold,
} from '@expo-google-fonts/poppins';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { SettingsProvider } from '@/context/SettingsContext';
import { PreferencesProvider } from '@/context/PreferencesContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { PinGate } from '@/components/PinGate';
import { SetDiaryLockPrompt } from '@/components/lock/SetDiaryLockPrompt';
import { BackupAutoScheduler } from '@/components/lock/BackupAutoScheduler';
import { fonts } from '@/constants/theme';
import { warmDiaryApi } from '@/lib/apiWarmup';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

// Start waking the free Render dyno immediately (parallel with fonts).
void warmDiaryApi();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Montserrat_600SemiBold,
    Montserrat_400Regular_Italic,
    Poppins_400Regular,
    Poppins_600SemiBold,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <ThemeProvider>
      <SettingsProvider>
        <PreferencesProvider>
          <PinGate>
            <ThemedStack />
            <SetDiaryLockPrompt />
            <BackupAutoScheduler />
          </PinGate>
        </PreferencesProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}

function ThemedStack() {
  const { tokens, isDark, ready, themeId } = useTheme();
  const flash = useRef(new Animated.Value(0)).current;
  const first = useRef(true);

  useEffect(() => {
    if (!ready) return;
    if (first.current) {
      first.current = false;
      return;
    }
    flash.setValue(0.28);
    Animated.timing(flash, {
      toValue: 0,
      duration: 380,
      useNativeDriver: true,
    }).start();
  }, [themeId, ready, flash]);

  if (!ready) return null;

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: tokens.bg },
          headerTintColor: tokens.text,
          headerTitleStyle: { fontFamily: fonts.display, color: tokens.text },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: tokens.bg },
        }}
      >
        <Stack.Screen name="(main)" options={{ headerShown: false }} />
        <Stack.Screen name="day/[date]" options={{ title: 'Day' }} />
        <Stack.Screen name="photo/[id]" options={{ title: 'Photo', presentation: 'modal' }} />
        <Stack.Screen name="search" options={{ title: 'Search' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="themes" options={{ title: 'Themes' }} />
        <Stack.Screen name="gallery" options={{ title: 'Photos' }} />
        <Stack.Screen name="export-import" options={{ title: 'Export & Import' }} />
        <Stack.Screen name="backup-restore" options={{ title: 'Backup and Restore' }} />
        <Stack.Screen name="legends" options={{ title: 'Legends' }} />
        <Stack.Screen name="tags" options={{ title: 'Tag Management' }} />
        <Stack.Screen name="lock" options={{ title: 'Set Diary Lock' }} />
      </Stack>
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: tokens.bg,
            opacity: flash,
            zIndex: 999,
          },
        ]}
      />
    </>
  );
}
