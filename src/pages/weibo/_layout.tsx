import { Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { View, ActivityIndicator, Text } from 'react-native';
import weiboService from '../../service/weibo';


export default function ExerciseLayout() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initDB = async () => {
      try {
        await weiboService.getInstance().initDB();
        setIsReady(true);
      } catch (error) {
        console.error('Failed to initialize database:', error);
      }
    };
    initDB();
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10 }}>加载中...</Text>
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '微博',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="figure.core.training" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: '搜索',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="figure.core.training" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="detail"
        options={{
          title: '详情',
          href: null,
        }}
      />
      <Tabs.Screen
        name="repost"
        options={{
          title: '转发',
          href: null,
        }}
      />
      <Tabs.Screen
        name="TSRVerify"
        options={{
          title: 'tsrVerify',
          href: null,
        }}
      />
    </Tabs>
  );
}
