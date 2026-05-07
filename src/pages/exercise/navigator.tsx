import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator, Text } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { exerciseService } from '@/src/service/exercise/exercise';

import AbdominalScreen from './abdominal';
import SitupScreen from './situp';
import RunScreen from './run';
import RecordScreen from './record';
import TSRVerifyScreen from './tsrVerify';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// 为 record 页面创建 Stack Navigator，以支持 TSRVerify 导航
const RecordStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Record" component={RecordScreen} />
      <Stack.Screen name="TSRVerify" component={TSRVerifyScreen} />
    </Stack.Navigator>
  );
};

const ExerciseNavigator = () => {
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
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
      }}>
      <Tab.Screen
        name="abdominal"
        component={AbdominalScreen}
        options={{
          title: '腹肌',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="figure.core.training" color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="situp"
        component={SitupScreen}
        options={{
          title: '力量',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="figure.strengthtraining.traditional" color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="run"
        component={RunScreen}
        options={{
          title: '跑步',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="figure.run" color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="record"
        component={RecordStack}
        options={{
          title: '记录',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="clock.fill" color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default ExerciseNavigator;
