import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import FileManagerScreen from '@/src/pages/tool/fileManager';
import PregnancyScreen from '@/src/pages/tool/pregnancy';
import DownloadScreen from '@/src/pages/tool/download';
import SettingScreen from '@/src/pages/tool/setting';
import SQLiteManagerScreen from '@/src/pages/tool/sqliteManager';


const Tab = createBottomTabNavigator();

const ToolNavigator = () => {
  const colorScheme = useColorScheme();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
      }}>
        <Tab.Screen
            name="fileManager"
            component={FileManagerScreen}
            options={{
                title: '文件管理',
                tabBarIcon: ({ color }) => (
                    <IconSymbol size={28} name="folder.fill" color={color} />
                ),
            }}
        />
        <Tab.Screen
            name="pregnancy"
            component={PregnancyScreen}
            options={{
                title: '孕周',
                tabBarIcon: ({ color }) => (
                    <IconSymbol size={28} name="stroller" color={color} />
                ),
            }}
        />
        <Tab.Screen
            name="sqliteManager"
            component={SQLiteManagerScreen}
            options={{
                title: 'SQLite管理',
                tabBarIcon: ({ color }) => (
                    <IconSymbol size={28} name="tablecells.fill" color={color} />
                ),
            }}
        />
        <Tab.Screen
            name="download"
            component={DownloadScreen}
            options={{
                title: '下载',
                tabBarIcon: ({ color }) => (
                    <IconSymbol size={28} name="arrow.down.circle" color={color} />
                ),
            }}
        />
        <Tab.Screen
            name="setting"
            component={SettingScreen}
            options={{
                title: '设置',
                tabBarIcon: ({ color }) => (
                    <IconSymbol size={28} name="gearshape.fill" color={color} />
                ),
            }}
        />
    </Tab.Navigator>
  );
};

export default ToolNavigator;
