import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Setting } from '../service/setting/types';
import defaultSetting from '../service/setting/defaultSetting';
import SettingService from '../service/setting/setting';

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
    }
    return [success, error];
  }, []);

  const refreshSetting = useCallback(async () => {
    await loadSetting();
  }, [loadSetting]);

  return (
    <SettingContext.Provider value={{ setting, updateSetting, refreshSetting }}>
      {children}
    </SettingContext.Provider>
  );
};
