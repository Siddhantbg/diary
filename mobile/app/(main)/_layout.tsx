import React from 'react';
import { Tabs, usePathname } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { DrawerShellProvider } from '@/context/DrawerShellContext';
import { AppDrawer } from '@/components/shell/AppDrawer';
import { MainTabBar } from '@/components/shell/MainTabBar';
import { ShellHeader } from '@/components/shell/ShellHeader';
import { View } from 'react-native';

export default function MainLayout() {
  const { tokens } = useTheme();
  const pathname = usePathname();
  // Home uses its own hero chrome (menu / gift / search) over the landscape
  const isHome =
    pathname === '/' ||
    pathname === '/index' ||
    pathname?.endsWith('/(main)') ||
    pathname?.endsWith('/(main)/') ||
    pathname?.endsWith('/(main)/index');

  return (
    <DrawerShellProvider>
      <View style={{ flex: 1, backgroundColor: tokens.bg }}>
        {!isHome ? <ShellHeader /> : null}
        <Tabs
          tabBar={(props) => <MainTabBar {...props} />}
          screenOptions={{
            headerShown: false,
            sceneStyle: { backgroundColor: tokens.bg },
          }}
        >
          <Tabs.Screen name="index" options={{ title: 'Home' }} />
          <Tabs.Screen name="calendar" options={{ title: 'Calendar' }} />
          <Tabs.Screen name="mine" options={{ title: 'Mine' }} />
        </Tabs>
        <AppDrawer />
      </View>
    </DrawerShellProvider>
  );
}
