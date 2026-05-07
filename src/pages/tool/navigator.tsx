import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// 导入实际的页面组件（需要从 app 目录迁移）
const FileManagerScreen = () => <></>;
const PregnancyScreen = () => <></>;
const DownloadScreen = () => <></>;
const SettingScreen = () => <></>;

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
