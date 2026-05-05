import { Tabs } from 'expo-router';
import React from 'react';

export default function ChildrenLayout() {
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
                }}
            />
            <Tabs.Screen
                name="stats"
                options={{
                    title: '统计',
                    tabBarLabel: '统计',
                }}
            />
        </Tabs>
    );
}
