import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useSettings } from '@/context/SettingsContext';
import { useTheme } from '@/context/ThemeContext';
import { fonts, radius, spacing } from '@/constants/theme';
import { GalleryIcon } from '@/components/icons/GalleryIcon';

type Props = {
  photoIds: string[];
  onAdd?: () => void;
  onDelete?: (id: string) => void;
  uploading?: boolean;
};

export function PhotoGrid({ photoIds, onAdd, onDelete, uploading }: Props) {
  const { api, config } = useSettings();
  const { tokens, isDark } = useTheme();

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.labelRow}>
          <GalleryIcon
            color={tokens.textMuted}
            variant={isDark ? 'dark' : 'light'}
            size={16}
          />
          <Text style={[styles.label, { color: tokens.textMuted }]}>Photos</Text>
        </View>
        {onAdd ? (
          <Pressable
            onPress={onAdd}
            style={[styles.addBtn, { backgroundColor: tokens.accent }]}
            disabled={uploading}
            accessibilityLabel={uploading ? 'Uploading photo' : 'Add photo'}
          >
            <GalleryIcon color="#FFFFFF" size={14} />
            <Text style={styles.addText}>{uploading ? 'Uploading…' : 'Add'}</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.grid}>
        {photoIds.map((id) => {
          const uri = api.photoUrl(id);
          return (
            <View key={id} style={[styles.cell, { backgroundColor: tokens.bgElevated }]}>
              <Link href={`/photo/${id}`} asChild>
                <Pressable style={{ flex: 1 }}>
                  <Image
                    source={{
                      uri,
                      headers: { 'x-api-secret': config.apiSecret },
                    }}
                    style={styles.image}
                    contentFit="cover"
                    transition={120}
                  />
                </Pressable>
              </Link>
              {onDelete ? (
                <Pressable style={styles.delete} onPress={() => onDelete(id)}>
                  <Text style={styles.deleteText}>×</Text>
                </Pressable>
              ) : null}
            </View>
          );
        })}
        {uploading ? (
          <View
            style={[
              styles.cell,
              styles.placeholder,
              { backgroundColor: tokens.bgElevated },
            ]}
          >
            <ActivityIndicator color={tokens.accent} />
          </View>
        ) : null}
        {!photoIds.length && !uploading && onAdd ? (
          <Text style={[styles.empty, { color: tokens.textMuted }]}>
            No photos yet — capture this day.
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  addText: {
    color: '#FFFFFF',
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cell: {
    width: '31%',
    aspectRatio: 1,
    position: 'relative',
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  delete: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 18,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    fontFamily: fonts.body,
    fontSize: 14,
    paddingVertical: spacing.sm,
  },
});
