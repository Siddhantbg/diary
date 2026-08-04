import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname, useRouter } from 'expo-router';
import { useDrawerShell } from '@/context/DrawerShellContext';
import { useTheme } from '@/context/ThemeContext';
import { fonts, spacing } from '@/constants/theme';
import { MyDiaryTitle } from '@/components/brand/DiaryMark';

type Props = {
  title?: string;
  showSearch?: boolean;
  right?: React.ReactNode;
};

export function ShellHeader({ title, showSearch, right }: Props) {
  const { tokens } = useTheme();
  const { openDrawer } = useDrawerShell();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  const isMine = pathname === '/mine' || pathname?.endsWith('/mine');
  const isCalendar = pathname === '/calendar' || pathname?.endsWith('/calendar');

  const resolvedTitle = title ?? (isMine ? 'Mine' : isCalendar ? 'Calendar' : 'MyDiary');
  const isBrandTitle = resolvedTitle === 'MyDiary';
  const resolvedSearch = showSearch ?? !isMine;

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingTop: insets.top + 8,
          backgroundColor: tokens.bg,
          borderBottomColor: tokens.line,
        },
      ]}
    >
      <Pressable
        onPress={openDrawer}
        hitSlop={12}
        accessibilityLabel="Open menu"
        style={styles.iconBtn}
      >
        <Text style={[styles.icon, { color: tokens.text }]}>☰</Text>
      </Pressable>

      <Pressable onPress={() => router.push('/')} style={styles.titlePress}>
        {isBrandTitle ? (
          <MyDiaryTitle color={tokens.text} fontSize={22} markSize={30} />
        ) : (
          <Text style={[styles.title, { color: tokens.text }]} numberOfLines={1}>
            {resolvedTitle}
          </Text>
        )}
      </Pressable>

      <View style={styles.right}>
        {resolvedSearch ? (
          <Pressable
            onPress={() => router.push('/search')}
            hitSlop={12}
            accessibilityLabel="Search"
            style={styles.iconBtn}
          >
            <Text style={[styles.icon, { color: tokens.text }]}>⌕</Text>
          </Pressable>
        ) : null}
        {isMine ? (
          <Pressable
            onPress={() => router.push('/settings')}
            hitSlop={12}
            accessibilityLabel="Settings"
            style={styles.iconBtn}
          >
            <Text style={[styles.icon, { color: tokens.text }]}>⚙</Text>
          </Pressable>
        ) : null}
        {right}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: 12,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 22,
    fontFamily: fonts.bodyMedium,
  },
  titlePress: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 22,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
