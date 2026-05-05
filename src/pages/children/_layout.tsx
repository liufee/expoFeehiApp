import { Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { childrenService } from '@/src/service/children/children';

export default function ChildrenLayout() {
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const initDB = async () => {
            try {
                await childrenService.initDB();
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
                tabBarActiveTintColor: '#007AFF',
                headerShown: false,
            }}
        >
            <Tabs.Screen
                name="write"
                options={{
                    title: '记录',
                    tabBarLabel: '记录',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="create-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="stats"
                options={{
                    title: '统计',
                    tabBarLabel: '统计',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="stats-chart-outline" size={size} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
