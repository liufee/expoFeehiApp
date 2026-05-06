import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { ToastProvider, LoadingProvider, SettingProvider } from '@/src/provider';

export const unstable_settings = {
  anchor: 'index',
};


export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <SettingProvider>
          <ToastProvider>
            <LoadingProvider>
              <Stack>
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
                <Stack.Screen name="exercise" options={{ headerShown: false }} />
                <Stack.Screen name="children" options={{ headerShown: false }} />
                <Stack.Screen name="tool" options={{ headerShown: false }} />
                <Stack.Screen name="weibo" options={{ headerShown: true }} />
              </Stack>
              <StatusBar style="auto" />
            </LoadingProvider>
          </ToastProvider>
        </SettingProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
