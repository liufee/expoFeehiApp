import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HomeScreen() {
    const insets = useSafeAreaInsets();
    
    const menuItems = [
        { title: '运动健身', icon: '🏃', route: '/exercise', color: '#4CAF50', description: '腹肌、力量、跑步训练' },
        { title: '孩子', icon: '👶', route: '/children', color: '#2196F3', description: '记录宝宝成长点滴' },
        { title: '微博', icon: '📢', route: '/weibo', color: '#E6162D', description: '社交媒体浏览' },
        { title: '工具', icon: '🔧', route: '/tool', color: '#FF9800', description: '实用工具集合' },
    ];

    return (
        <ScrollView 
            style={styles.container}
            contentContainerStyle={[
                styles.contentContainer,
                { 
                    paddingTop: insets.top + 20,
                    paddingBottom: insets.bottom + 20,
                }
            ]}>
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
    contentContainer: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    menuContainer: {
        padding: 15,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    menuIcon: {
        fontSize: 28,
        marginRight: 12,
    },
    menuContent: {
        flex: 1,
    },
    menuTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    menuDescription: {
        fontSize: 13,
        color: '#fff',
        opacity: 0.9,
    },
});
