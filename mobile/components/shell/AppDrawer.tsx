import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDrawerShell } from '@/context/DrawerShellContext';
import { useTheme } from '@/context/ThemeContext';
import { fonts, radius, spacing } from '@/constants/theme';
import { SheetCloseButton } from '@/components/ui/SheetClose';
import { ActionSheet, SheetAction } from '@/components/ui/ActionSheet';
import { GalleryIcon } from '@/components/icons/GalleryIcon';
import { TagIcon } from '@/components/icons/TagIcon';
import { LockIcon } from '@/components/icons/LockIcon';
import { BackupIcon } from '@/components/icons/BackupIcon';
import { ExportIcon } from '@/components/icons/ExportIcon';
import { ThemeIcon } from '@/components/icons/ThemeIcon';
import { LegendIcon } from '@/components/icons/LegendIcon';
import { MyDiaryTitle } from '@/components/brand/DiaryMark';

type Item = {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  stub?: boolean;
};

type SheetState = {
  title: string;
  message?: string;
  actions: SheetAction[];
};

export function AppDrawer() {
  const { open, closeDrawer } = useDrawerShell();
  const { tokens, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [sheet, setSheet] = useState<SheetState | null>(null);

  const go = (path: string) => {
    closeDrawer();
    router.push(path as never);
  };

  const stub = (label: string) => {
    closeDrawer();
    setSheet({
      title: label,
      message: 'This feature is coming soon.',
      actions: [{ key: 'ok', label: 'Got it', icon: '✓', onPress: () => undefined }],
    });
  };

  const iconSize = 28;
  const iconVariant = isDark ? 'dark' : 'light';

  const groups: Item[][] = [
    [
      { label: 'Home', icon: '⌂', onPress: () => go('/') },
      {
        label: 'Theme',
        icon: (
          <ThemeIcon
            color={tokens.text}
            cutoutColor={tokens.bgElevated}
            variant={iconVariant}
            size={iconSize}
          />
        ),
        onPress: () => go('/themes'),
      },
    ],
    [
      {
        label: 'Tags',
        icon: <TagIcon color={tokens.text} variant={iconVariant} size={iconSize} />,
        onPress: () => go('/tags'),
      },
      {
        label: 'Legends',
        icon: (
          <LegendIcon
            color={tokens.text}
            variant={iconVariant}
            chipColors={['#4A90E2', '#FFC857', '#5BC57A']}
            size={iconSize}
          />
        ),
        onPress: () => go('/legends'),
      },
      {
        label: 'Diary Lock',
        icon: <LockIcon color={tokens.text} variant={iconVariant} size={iconSize} />,
        onPress: () => go('/lock'),
      },
      {
        label: 'Backup & Restore',
        icon: (
          <BackupIcon
            color={tokens.text}
            cutoutColor={tokens.bgElevated}
            variant={iconVariant}
            size={iconSize}
          />
        ),
        onPress: () => go('/backup-restore'),
      },
      {
        label: 'Export & Import',
        icon: (
          <ExportIcon
            color={tokens.text}
            cutoutColor={tokens.bgElevated}
            variant={iconVariant}
            size={iconSize}
          />
        ),
        onPress: () => go('/export-import'),
      },
    ],
    [
      { label: 'Settings', icon: '⚙', onPress: () => go('/settings') },
      { label: 'Search', icon: '⌕', onPress: () => go('/search') },
      {
        label: 'Photos',
        icon: <GalleryIcon color={tokens.text} variant={iconVariant} size={iconSize} />,
        onPress: () => go('/gallery'),
      },
      { label: 'Help Center', icon: '?', onPress: () => stub('Help Center'), stub: true },
    ],
  ];

  return (
    <>
    <Modal visible={open} animationType="fade" transparent onRequestClose={closeDrawer}>
      <View style={styles.overlay}>
        <Pressable style={styles.dim} onPress={closeDrawer} />
        <View
          style={[
            styles.panel,
            {
              backgroundColor: tokens.bgElevated,
              paddingTop: insets.top + 12,
              paddingBottom: insets.bottom + 16,
            },
          ]}
        >
          <View style={styles.topBar}>
            <View style={{ flex: 1 }} />
            <SheetCloseButton onPress={closeDrawer} />
          </View>

          <View style={[styles.brand, { backgroundColor: tokens.accent }]}>
            <MyDiaryTitle color="#FFFFFF" fontSize={22} markSize={40} />
          </View>

          <ScrollView contentContainerStyle={{ paddingVertical: spacing.md }}>
            {groups.map((group, gi) => (
              <View key={gi}>
                {gi > 0 ? (
                  <View style={[styles.divider, { backgroundColor: tokens.line }]} />
                ) : null}
                {group.map((item) => (
                  <Pressable
                    key={item.label}
                    onPress={item.onPress}
                    style={({ pressed }) => [
                      styles.row,
                      { opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    {typeof item.icon === 'string' || typeof item.icon === 'number' ? (
                      <Text style={[styles.rowIcon, { color: tokens.text }]}>{item.icon}</Text>
                    ) : (
                      <View style={styles.rowIconNode}>{item.icon}</View>
                    )}
                    <Text style={[styles.rowLabel, { color: tokens.text }]}>
                      {item.label}
                      {item.stub ? (
                        <Text style={{ color: tokens.textSubtle, fontSize: 12 }}> · soon</Text>
                      ) : null}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>

    <ActionSheet
      visible={!!sheet}
      title={sheet?.title ?? ''}
      message={sheet?.message}
      actions={sheet?.actions ?? []}
      onClose={() => setSheet(null)}
    />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  panel: {
    width: '78%',
    maxWidth: 320,
    height: '100%',
    zIndex: 2,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.sm,
    marginBottom: 4,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.sm,
    marginHorizontal: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
  },
  rowIcon: {
    width: 34,
    fontSize: 24,
    textAlign: 'center',
    lineHeight: 28,
  },
  rowIconNode: {
    width: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    fontFamily: fonts.body,
    fontSize: 16,
  },
});
