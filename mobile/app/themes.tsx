import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { ThemePreviewCard } from '@/components/themes/ThemePreviewCard';
import { getThemesByCategory } from '@/constants/themeCatalog';
import { fonts, spacing } from '@/constants/theme';

const TABS = ['hot', 'dark', 'light'] as const;
type Tab = (typeof TABS)[number];

export default function ThemesScreen() {
  const { tokens, themeId, setThemeId, catalog } = useTheme();
  const current = catalog.find((t) => t.id === themeId);
  const [tab, setTab] = useState<Tab>((current?.category as Tab) || 'dark');

  const filtered = useMemo(() => getThemesByCategory(tab), [tab]);

  return (
    <View style={[styles.screen, { backgroundColor: tokens.bg }]}>
      <Stack.Screen
        options={{
          title: 'Themes',
          headerBackTitle: 'Back',
        }}
      />

      <View style={[styles.tabs, { borderBottomColor: tokens.line }]}>
        {TABS.map((t) => {
          const active = tab === t;
          return (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={[
                styles.tab,
                active && { borderBottomColor: tokens.accent, borderBottomWidth: 2 },
              ]}
            >
              <Text
                style={[
                  styles.tabLabel,
                  { color: active ? tokens.accent : tokens.textMuted },
                ]}
              >
                {t.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <Text style={[styles.empty, { color: tokens.textMuted }]}>
            No themes in this tab yet.
          </Text>
        ) : (
          filtered.map((pack) => (
            <ThemePreviewCard
              key={pack.id}
              pack={pack}
              selected={pack.id === themeId}
              onApply={() => setThemeId(pack.id)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
  },
  tabLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    letterSpacing: 1.2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: 48,
  },
  empty: {
    fontFamily: fonts.body,
    width: '100%',
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
