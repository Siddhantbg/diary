import React, { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useSettings } from '@/context/SettingsContext';
import { useTheme } from '@/context/ThemeContext';
import { friendlyApiMessage } from '@/lib/api';
import { formatCalendarStrip, toDateKey } from '@/lib/dates';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/ui/StateViews';
import { fonts, radius, spacing } from '@/constants/theme';
import { GalleryIcon } from '@/components/icons/GalleryIcon';

type PhotoItem = {
  id: string;
  date: string;
  title: string;
};

/** All days with photos — Calendar gallery entry + standalone route. */
export default function GalleryScreen() {
  const { api, config } = useSettings();
  const { tokens, isDark } = useTheme();
  const router = useRouter();
  const [items, setItems] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const entries = await api.listEntries(100);
      const next: PhotoItem[] = [];
      for (const e of entries) {
        for (const pid of e.photoIds || []) {
          next.push({
            id: pid,
            date: e.date,
            title: e.title || 'Untitled day',
          });
        }
      }
      setItems(next);
    } catch (e: unknown) {
      setError(friendlyApiMessage(e));
    } finally {
      setLoading(false);
    }
  }, [api]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  return (
    <View style={[styles.screen, { backgroundColor: tokens.bg }]}>
      <Stack.Screen options={{ title: 'Photos', headerBackTitle: 'Back' }} />

      {loading ? (
        <LoadingBlock message="Loading photos…" />
      ) : error ? (
        <ErrorBlock
          message={error}
          onRetry={() => {
            setLoading(true);
            load();
          }}
        />
      ) : items.length === 0 ? (
        <View style={styles.emptyWrap}>
          <GalleryIcon
            color={tokens.textMuted}
            variant={isDark ? 'dark' : 'light'}
            size={40}
          />
          <EmptyBlock
            title="No photos yet"
            subtitle="Add photos from a day editor — they appear here and on the calendar."
            actionLabel="Write today"
            onAction={() => router.push(`/day/${toDateKey()}`)}
          />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={styles.list}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.cell, { backgroundColor: tokens.bgElevated }]}
              onPress={() => router.push(`/photo/${item.id}`)}
              onLongPress={() => router.push(`/day/${item.date}`)}
            >
              <ExpoImage
                source={{
                  uri: api.photoUrl(item.id),
                  headers: { 'x-api-secret': config.apiSecret },
                }}
                style={styles.image}
                contentFit="cover"
                transition={150}
              />
              <View style={styles.caption}>
                <Text style={styles.captionText} numberOfLines={1}>
                  {formatCalendarStrip(item.date).split(' , ')[1] || item.date}
                </Text>
              </View>
            </Pressable>
          )}
          ListHeaderComponent={
            <Text style={[styles.header, { color: tokens.textMuted }]}>
              {items.length} photo{items.length === 1 ? '' : 's'} · long-press opens the day
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xl,
    gap: spacing.sm,
  },
  list: {
    padding: spacing.sm,
    paddingBottom: 40,
  },
  header: {
    fontFamily: fonts.body,
    fontSize: 13,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  row: {
    gap: 6,
    marginBottom: 6,
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: '33%',
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  caption: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  captionText: {
    color: '#FFFFFF',
    fontFamily: fonts.body,
    fontSize: 9,
  },
});
