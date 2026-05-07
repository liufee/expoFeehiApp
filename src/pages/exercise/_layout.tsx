import { Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { View, ActivityIndicator, Text } from 'react-native';
import { exerciseService } from '@/src/service/exercise/exercise';


export default function ExerciseLayout() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initDB = async () => {
      try {
        await exerciseService.initDB();
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
        name="abdominal"
        options={{
          title: '腹肌',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="figure.core.training" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="situp"
        options={{
          title: '力量',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="figure.strengthtraining.traditional" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="run"
        options={{
          title: '跑步',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="figure.run" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="record"
        options={{
          title: '记录',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="clock.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tsrVerify"
        options={{
          title: 'tsrVerify',
          href: null,
        }}
      />
    </Tabs>
  );
}
