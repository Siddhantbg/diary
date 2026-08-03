import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useSettings } from '@/context/SettingsContext';
import { colors, fonts, spacing } from '@/constants/theme';

type Props = {
  photoIds: string[];
  onAdd: () => void;
  onDelete?: (id: string) => void;
  uploading?: boolean;
};

export function PhotoGrid({ photoIds, onAdd, onDelete, uploading }: Props) {
  const { api, config } = useSettings();

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.label}>Photos</Text>
        <Pressable onPress={onAdd} style={styles.addBtn} disabled={uploading}>
          <Text style={styles.addText}>{uploading ? 'Uploading…' : '+ Add'}</Text>
        </Pressable>
      </View>
      <View style={styles.grid}>
        {photoIds.map((id) => {
          const uri = api.photoUrl(id);
          return (
            <View key={id} style={styles.cell}>
              <Link href={`/photo/${id}`} asChild>
                <Pressable>
                  <Image
                    source={{
                      uri,
                      headers: { 'x-api-secret': config.apiSecret },
                    }}
                    style={styles.image}
                    contentFit="cover"
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
          <View style={[styles.cell, styles.placeholder]}>
            <ActivityIndicator color={colors.leaf} />
          </View>
        ) : null}
        {!photoIds.length && !uploading ? (
          <Text style={styles.empty}>No photos yet — capture this day.</Text>
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
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  addBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.leaf,
  },
  addText: {
    color: colors.white,
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
    backgroundColor: colors.paperDeep,
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
    backgroundColor: 'rgba(28,43,36,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: {
    color: colors.white,
    fontSize: 16,
    lineHeight: 18,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    fontFamily: fonts.body,
    color: colors.inkMuted,
    fontSize: 14,
    paddingVertical: spacing.sm,
  },
});
