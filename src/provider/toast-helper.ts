import { ToastConfig } from './toast';

// 全局toast引用
let globalShowToast: ((config: ToastConfig) => void) | null = null;

/**
 * 设置全局toast显示函数
 * @internal 仅供ToastProvider内部使用
 */
export const setGlobalShowToast = (showToast: (config: ToastConfig) => void) => {
  globalShowToast = showToast;
};

/**
 * 全局显示toast方法
 * @param config toast配置
 */
export const showToast = (config: string | ToastConfig) => {
  if (typeof config === 'string') {
    config = { message: config };
  }
  
  if (!globalShowToast) {
    console.warn('ToastProvider not initialized. Please wrap your app with ToastProvider.');
    return;
  }
  
  globalShowToast(config);
};
