import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
        <Tabs.Screen
            name="fileManager/index"
            options={{
                title: '文件管理',
                href: "/tool/fileManager",
                tabBarIcon: ({ color }) => (
                    <IconSymbol size={28} name="folder.fill" color={color} />
                ),
            }}
        />
        <Tabs.Screen
            name="pregnancy/index"
            options={{
                title: '孕周',
                href: "/tool/pregnancy",
                tabBarIcon: ({ color }) => (
                    <IconSymbol size={28} name="arrow.down.circle" color={color} />
                ),
            }}
        />
        <Tabs.Screen
            name="download/index"
            options={{
                title: '下载',
                href: "/tool/download",
                tabBarIcon: ({ color }) => (
                    <IconSymbol size={28} name="arrow.down.circle" color={color} />
                ),
            }}
        />
    </Tabs>
  );
}
