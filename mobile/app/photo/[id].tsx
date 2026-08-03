import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useSettings } from '@/context/SettingsContext';
import { colors } from '@/constants/theme';

export default function PhotoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api, config } = useSettings();
  const uri = api && id ? api.photoUrl(id) : '';

  return (
    <View style={styles.screen}>
      {uri ? (
        <Image
          source={{ uri, headers: { 'x-api-secret': config.apiSecret } }}
          style={styles.image}
          contentFit="contain"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0E1511',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
