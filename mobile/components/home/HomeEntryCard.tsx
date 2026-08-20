import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSettings } from '@/context/SettingsContext';
import { useTheme } from '@/context/ThemeContext';
import { parseDateKey } from '@/lib/dates';
import { fonts, radius } from '@/constants/theme';
import { DraftIcon } from '@/components/icons/DraftIcon';
import { GemIcon } from '@/components/gems/GemIcon';
import { MoodFace } from '@/components/mood/MoodFace';
import { cherishedGemId, loadLegends } from '@/lib/legends';
import { DEFAULT_CHERISHED_GEM } from '@/lib/gems';

export type HomeListItem = {
  date: string;
  mood: number | null;
  isDraft: boolean;
  isFavorite?: boolean;
  gemId?: string | null;
  /** Day title */
  title?: string;
  /** First lines of the day’s writing */
  preview?: string;
  photoIds?: string[];
  /** Soft status under month when not a pure draft */
  statusLabel?: string;
};

type Props = {
  item: HomeListItem;
};

const PREVIEW_PHOTOS = 2;

/**
 * One home card: date / month / mood, glimpse text, and photos in the same box.
 */
export function HomeEntryCard({ item }: Props) {
  const router = useRouter();
  const { tokens, isDark } = useTheme();
  const { api, config } = useSettings();
  const d = parseDateKey(item.date);
  const dayNum = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  const [cherishGem, setCherishGem] = useState(DEFAULT_CHERISHED_GEM);
  const [cherishColor, setCherishColor] = useState('#FFC857');

  useEffect(() => {
    void loadLegends().then((list) => {
      setCherishGem(cherishedGemId(list));
      const c = list.find((l) => l.system === 'cherished')?.color;
      if (c) setCherishColor(c);
    });
  }, []);

  const status = item.isDraft
    ? 'Draft'
    : item.statusLabel
      ? item.statusLabel
      : item.isFavorite
        ? 'Cherished'
        : '';

  const title = (item.title || '').trim();
  const preview = (item.preview || '').trim();
  const photos = (item.photoIds || []).filter(Boolean);
  const shownPhotos = photos.slice(0, PREVIEW_PHOTOS);
  const extraPhotos = Math.max(0, photos.length - shownPhotos.length);
  const href = item.isDraft ? `/day/${item.date}?mode=edit` : `/day/${item.date}`;

  return (
    <Pressable
      onPress={() => router.push(href)}
      style={[
        styles.card,
        {
          backgroundColor: tokens.bgElevated,
          borderColor: tokens.line,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${month} ${dayNum}${status ? `, ${status}` : ''}`}
    >
      <View style={styles.row}>
        <View style={styles.rail}>
          <Text style={[styles.day, { color: tokens.text }]}>{dayNum}</Text>
          <Text style={[styles.month, { color: tokens.textMuted }]}>{month}</Text>
          <View style={styles.mood}>
            <MoodFace mood={item.mood} size={36} />
          </View>
          {status ? (
            <View style={styles.statusRow}>
              {item.isDraft ? (
                <DraftIcon
                  variant={isDark ? 'dark' : 'light'}
                  color={tokens.textMuted}
                  fillColor={isDark ? 'rgba(197, 228, 245, 0.25)' : '#E1F5FE'}
                  size={14}
                />
              ) : item.isFavorite ? (
                <GemIcon gemId={item.gemId || cherishGem} size={14} />
              ) : (
                <Text style={[styles.statusIcon, { color: tokens.textSubtle }]}>▣</Text>
              )}
              <Text
                style={[
                  styles.status,
                  {
                    color: item.isFavorite && !item.isDraft ? cherishColor : tokens.textMuted,
                  },
                ]}
                numberOfLines={1}
              >
                {status}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.body}>
          {title ? (
            <Text
              style={[styles.glimpseTitle, { color: tokens.text }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {title}
            </Text>
          ) : null}
          {preview ? (
            <Text
              style={[styles.glimpseText, { color: tokens.textMuted }]}
              numberOfLines={title ? 3 : 4}
              ellipsizeMode="tail"
            >
              {preview}
            </Text>
          ) : !title ? (
            <Text style={[styles.glimpseText, { color: tokens.textSubtle }]} numberOfLines={2}>
              Tap to open this day
            </Text>
          ) : null}
        </View>

        {shownPhotos.length > 0 ? (
          <View style={styles.photoRow}>
            {shownPhotos.map((id, i) => (
              <View
                key={id}
                style={[
                  styles.photoWrap,
                  { backgroundColor: tokens.bgCard, borderColor: tokens.line },
                ]}
              >
                <Image
                  source={{
                    uri: api.photoUrl(id),
                    headers: { 'x-api-secret': config.apiSecret },
                  }}
                  style={styles.photo}
                  contentFit="cover"
                  transition={120}
                />
                {i === shownPhotos.length - 1 && extraPhotos > 0 ? (
                  <View style={styles.moreOverlay}>
                    <Text style={styles.moreText}>+{extraPhotos}</Text>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    alignSelf: 'stretch',
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  rail: {
    width: 52,
    flexGrow: 0,
    flexShrink: 0,
    alignItems: 'center',
  },
  day: {
    fontFamily: fonts.display,
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.5,
  },
  month: {
    fontFamily: fonts.body,
    fontSize: 12,
    marginBottom: 4,
  },
  mood: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
    maxWidth: 52,
  },
  statusIcon: {
    fontSize: 11,
  },
  status: {
    fontFamily: fonts.body,
    fontSize: 10,
    flexShrink: 1,
  },
  body: {
    flex: 1,
    minWidth: 80,
    paddingHorizontal: 10,
  },
  glimpseTitle: {
    fontFamily: fonts.display,
    fontSize: 14,
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  glimpseText: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 17,
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexGrow: 0,
    flexShrink: 0,
  },
  photoWrap: {
    width: 52,
    height: 52,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  photo: {
    width: 52,
    height: 52,
  },
  moreOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreText: {
    color: '#FFFFFF',
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
});
