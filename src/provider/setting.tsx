import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Setting } from '../service/setting/types';
import defaultSetting from '../service/setting/defaultSetting';
import SettingService from '../service/setting/setting';
import { ExerciseService } from '../service/exercise/exercise';

interface SettingContextType {
  setting: Setting;
  updateSetting: (newSetting: Setting) => Promise<[boolean, string]>;
  refreshSetting: () => Promise<void>;
}

const SettingContext = createContext<SettingContextType | undefined>(undefined);

export const useSetting = () => {
  const context = useContext(SettingContext);
  if (!context) {
    throw new Error('useSetting must be used within a SettingProvider');
  }
  return context;
};

export const SettingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [setting, setSetting] = useState<Setting>(defaultSetting);
  const [showDBTip, setShowDBTip] = useState(true);
  const settingService = SettingService.getInstance();

  const loadSetting = useCallback(async () => {
    const [success, loadedSetting, error] = await settingService.getSetting();
    if (success) {
      setSetting(loadedSetting);
    } else {
      console.warn('Failed to load setting:', error);
    }
  }, []);

  useEffect(() => {
    loadSetting();
  }, [loadSetting]);

  const updateSetting = useCallback(async (newSetting: Setting): Promise<[boolean, string]> => {
    const [success, error] = await settingService.updateSetting(newSetting);
    if (success) {
      setSetting(newSetting);
      // 通知 exercise service 更新 setting
      try {
        ExerciseService.getInstance().setSetting(newSetting);
      } catch (e) {
        console.warn('Failed to set setting to ExerciseService:', e);
      }
    }
    return [success, error];
  }, []);

  const refreshSetting = useCallback(async () => {
    await loadSetting();
  }, [loadSetting]);

  return (
    <SettingContext.Provider value={{ setting, updateSetting, refreshSetting }}>
      {/* 显示调试信息提示 */}
      {(setting.global.debugMode || setting.global.dbSuffix.length > 0) && showDBTip && (
        <View style={styles.tipContainer}>
          <Text style={styles.tipText}>
            {setting.global.debugMode ? 'Debug: true' : ''}
            {setting.global.dbSuffix.length > 0 ? '   DB Prefix: ' + setting.global.dbSuffix : ''}
          </Text>
          <TouchableOpacity onPress={() => setShowDBTip(false)} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
        </View>
      )}
      {children}
    </SettingContext.Provider>
  );
};

const styles = StyleSheet.create({
  tipContainer: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    zIndex: 9999,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tipText: {
    color: '#FFFFFF',
    fontSize: 10,
    flex: 1,
  },
  closeButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
});
