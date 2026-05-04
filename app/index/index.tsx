import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';

export default function HomeScreen() {
    const menuItems = [
        { title: '运动健身111', icon: '🏃', route: '/exercise', color: '#4CAF50', description: '腹肌、力量、跑步训练' },
        { title: '微博', icon: '📱', route: '/weibo', color: '#E6162D', description: '社交媒体浏览' },
    ];

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Feehi App</Text>
                <Text style={styles.subtitle}>选择功能模块</Text>
            </View>

            <View style={styles.menuContainer}>
                {menuItems.map((item, index) => (
                    <TouchableOpacity
                        key={index}
                        style={[styles.menuItem, { backgroundColor: item.color }]}
                        onPress={() => router.push(item.route as any)}>
                        <Text style={styles.menuIcon}>{item.icon}</Text>
                        <View style={styles.menuContent}>
                            <Text style={styles.menuTitle}>{item.title}</Text>
                            <Text style={styles.menuDescription}>{item.description}</Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        padding: 30,
        backgroundColor: '#fff',
        marginBottom: 10,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
    },
    menuContainer: {
        padding: 15,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        padding: 20,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    menuIcon: {
        fontSize: 48,
        marginRight: 15,
    },
    menuContent: {
        flex: 1,
    },
    menuTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 5,
    },
    menuDescription: {
        fontSize: 14,
        color: '#fff',
        opacity: 0.9,
    },
});
