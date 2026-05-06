import React, { createContext, useContext, useState, useCallback } from 'react';
import { View, Text, Modal, ActivityIndicator, StyleSheet } from 'react-native';

interface LoadingContextType {
  showLoading: (message?: string) => void;
  hideLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState<string>('');

  const showLoading = useCallback((msg?: string) => {
    setMessage(msg || '加载中...');
    setVisible(true);
  }, []);

  const hideLoading = useCallback(() => {
    setVisible(false);
  }, []);

  return (
    <LoadingContext.Provider value={{ showLoading, hideLoading }}>
      {children}
      <Modal
        transparent={true}
        visible={visible}
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.overlay}>
          <View style={styles.container}>
            <ActivityIndicator size="large" color="#ffffff" />
            {message ? <Text style={styles.message}>{message}</Text> : null}
          </View>
        </View>
      </Modal>
    </LoadingContext.Provider>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    minWidth: 120,
  },
  message: {
    color: '#ffffff',
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
  },
});