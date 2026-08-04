import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettings } from '@/context/SettingsContext';
import { useTheme } from '@/context/ThemeContext';
import { fonts, spacing } from '@/constants/theme';
import { SheetCloseButton } from '@/components/ui/SheetClose';

export default function PhotoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const photoId = Array.isArray(id) ? id[0] : id;
  const { api, config } = useSettings();
  const { tokens, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const uri = api && photoId ? api.photoUrl(photoId) : '';
  const { width, height } = Dimensions.get('window');

  return (
    <View style={[styles.screen, { backgroundColor: isDark ? '#000' : tokens.bg }]}>
      <Stack.Screen
        options={{
          title: 'Photo',
          presentation: 'modal',
          headerStyle: { backgroundColor: tokens.bg },
          headerTintColor: tokens.text,
          headerRight: () => (
            <SheetCloseButton onPress={() => router.back()} color={tokens.text} />
          ),
        }}
      />

      {!uri ? (
        <View style={styles.center}>
          <Text style={{ color: tokens.textMuted, fontFamily: fonts.body }}>Missing photo</Text>
        </View>
      ) : (
        <>
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={tokens.accent} size="large" />
            </View>
          ) : null}
          {error ? (
            <View style={styles.center}>
              <Text style={{ color: tokens.danger, fontFamily: fonts.body, textAlign: 'center' }}>
                {error}
              </Text>
              <Pressable
                onPress={() => {
                  setError('');
                  setLoading(true);
                }}
                style={{ marginTop: 12 }}
              >
                <Text style={{ color: tokens.accent, fontFamily: fonts.bodyMedium }}>Retry</Text>
              </Pressable>
            </View>
          ) : (
            <Image
              source={{
                uri,
                headers: { 'x-api-secret': config.apiSecret },
              }}
              style={{ width, height: height - insets.top - 56 }}
              contentFit="contain"
              transition={200}
              onLoad={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setError('Could not load photo. Check connection and try again.');
              }}
            />
          )}
        </>
      )}

      <Text
        style={[
          styles.hint,
          {
            color: tokens.textSubtle,
            paddingBottom: insets.bottom + spacing.sm,
          },
        ]}
      >
        Pinch not required — full view · GridFS
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  hint: {
    position: 'absolute',
    bottom: 0,
    fontFamily: fonts.body,
    fontSize: 11,
  },
});
