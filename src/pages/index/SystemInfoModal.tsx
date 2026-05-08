import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Platform } from 'react-native';
import Constants from 'expo-constants';
import { BUILD_INFO } from '@/src/config/buildInfo';

interface SystemInfoModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function SystemInfoModal({ visible, onClose }: SystemInfoModalProps) {
    const getReactNativeVersion = () => {
        const version = Platform.constants?.reactNativeVersion;
        if (version && typeof version === 'object') {
            return `${version.major}.${version.minor}.${version.patch}`;
        }
        return '0.81.5';
    };

    const infoItems = [
        { label: '发布时间', value: BUILD_INFO.publishTime, icon: '🚀' },
        { label: 'Git Commit', value: BUILD_INFO.gitCommit + ' ' + BUILD_INFO.gitBranch, icon: '📝' },
        { label: 'Commit 时间', value: BUILD_INFO.gitCommitTime, icon: '🕐' },
        { label: '应用版本', value: Constants.expoConfig?.name + ' ' + Constants.expoConfig?.version, icon: '📱' },
        { label: 'React Native', value: getReactNativeVersion(), icon: '⚛️' },
        { label: '平台', value: `${Platform.OS} ${Platform.Version}`, icon: '📲' },
        { label: 'Expo SDK', value: Constants.expoConfig?.sdkVersion, icon: '🔧' },
        { label: '开发模式', value: __DEV__ ? '开发环境' : '生产环境', icon: '🔨' },
    ];

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.header}>
                        <Text style={styles.title}>📋 系统信息</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Text style={styles.closeButtonText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content}>
                        {infoItems.map((item, index) => (
                            <View key={index} style={styles.infoItem}>
                                <Text style={styles.icon}>{item.icon}</Text>
                                <View style={styles.infoContent}>
                                    <Text style={styles.label}>{item.label}</Text>
                                    <Text style={styles.value}>{item.value}</Text>
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContainer: {
        backgroundColor: '#fff',
        borderRadius: 16,
        width: '100%',
        maxHeight: '80%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButtonText: {
        fontSize: 18,
        color: '#666',
    },
    content: {
        padding: 16,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5',
    },
    icon: {
        fontSize: 24,
        marginRight: 12,
        width: 32,
        textAlign: 'center',
    },
    infoContent: {
        flex: 1,
    },
    label: {
        fontSize: 13,
        color: '#999',
        marginBottom: 4,
    },
    value: {
        fontSize: 15,
        color: '#333',
        fontWeight: '500',
    },
});
