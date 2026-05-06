import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    FlatList,
    StyleSheet,
} from 'react-native';

interface PickerItem {
    name: string;
    value: string;
}

interface PickerProps {
    selectedValue: string;
    onValueChange: (value: string) => void;
    items: PickerItem[];
    placeholder?: string;
    style?: any;
    textStyle?: any;
    buttonStyle?: any;
}

export const Picker: React.FC<PickerProps> = ({
    selectedValue,
    onValueChange,
    items,
    placeholder = '请选择',
    style,
    textStyle,
    buttonStyle,
}) => {
    const [modalVisible, setModalVisible] = useState(false);
    
    // 找到当前选中的项
    const selectedItem = items.find(item => item.value === selectedValue);
    const displayText = selectedItem ? selectedItem.name : placeholder;

    const handleSelect = (value: string) => {
        onValueChange(value);
        setModalVisible(false);
    };

    return (
        <View style={[styles.container, style]}>
            <TouchableOpacity
                style={[styles.pickerButton, buttonStyle]}
                onPress={() => setModalVisible(true)}
            >
                <Text numberOfLines={1} style={[styles.pickerText, textStyle]}>{displayText}</Text>
                <Text style={styles.arrow}>▼</Text>
            </TouchableOpacity>

            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <TouchableOpacity 
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setModalVisible(false)}
                >
                    <View style={styles.modalContent}>
                        <FlatList
                            data={items}
                            keyExtractor={(item, index) => `${item.value}-${index}`}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.optionItem,
                                        item.value === selectedValue && styles.selectedOption
                                    ]}
                                    onPress={() => handleSelect(item.value)}
                                >
                                    <Text 
                                        numberOfLines={1}
                                        style={[
                                            styles.optionText,
                                            item.value === selectedValue && styles.selectedOptionText
                                        ]}
                                    >
                                        {item.name}
                                    </Text>
                                    {item.value === selectedValue && (
                                        <Text style={styles.checkmark}>✓</Text>
                                    )}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'relative',
    },
    pickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    pickerText: {
        fontSize: 16,
        color: '#333',
        flex: 1,
    },
    arrow: {
        fontSize: 12,
        color: '#666',
        marginLeft: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 12,
        width: '80%',
        maxHeight: '60%',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    selectedOption: {
        backgroundColor: '#e3f2fd',
    },
    optionText: {
        fontSize: 16,
        color: '#333',
        flex: 1,
    },
    selectedOptionText: {
        fontWeight: 'bold',
        color: '#1976d2',
    },
    checkmark: {
        fontSize: 16,
        color: '#1976d2',
        marginLeft: 8,
    },
});
