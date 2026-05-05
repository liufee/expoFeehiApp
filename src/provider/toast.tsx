import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, Animated, StyleSheet, TouchableOpacity } from 'react-native';
import { setGlobalShowToast } from './toast-helper';

interface ToastConfig {
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  backgroundColor?: string;
}

interface ToastContextType {
  showToast: (config: ToastConfig) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'success' | 'error' | 'info' | 'warning'>('success');
  const [customBackgroundColor, setCustomBackgroundColor] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-50)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 将showToast注册到全局
  useEffect(() => {
    setGlobalShowToast(showToast);
    return () => {
      setGlobalShowToast(() => null);
    };
  }, [showToast]);

  const showToast = useCallback((config: ToastConfig) => {
    // 清除之前的定时器
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    setMessage(config.message);
    setType(config.type || 'success');
    setCustomBackgroundColor(config.backgroundColor || null);
    setVisible(true);

    // 显示动画
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // 自动隐藏
    const duration = config.duration || 2000;
    timerRef.current = setTimeout(() => {
      hideToast();
    }, duration);
  }, [fadeAnim, slideAnim]);

  const hideToast = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
    });
  }, [fadeAnim, slideAnim]);

  const getBackgroundColor = () => {
    // 如果传入了自定义背景色，优先使用
    if (customBackgroundColor) {
      return customBackgroundColor;
    }
    
    // 否则根据类型返回默认颜色
    switch (type) {
      case 'success':
        return '#4CAF50'; // 绿色（默认）
      case 'error':
        return '#F44336';
      case 'warning':
        return '#FF9800';
      default:
        return '#4CAF50'; // 默认也是绿色
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {visible && (
        <Animated.View
          style={[
            styles.container,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
              backgroundColor: getBackgroundColor(),
            },
          ]}
        >
          <TouchableOpacity onPress={hideToast} style={styles.content}>
            <Text style={styles.message}>{message}</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    zIndex: 9999,
    borderRadius: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  content: {
    padding: 16,
  },
  message: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
  },
});
