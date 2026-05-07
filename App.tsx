import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { enableScreens } from 'react-native-screens';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SettingProvider, ToastProvider, LoadingProvider } from './src/provider';
import IndexNavigator from './src/pages/index/navigator';
import ExerciseNavigator from './src/pages/exercise/navigator';
import WeiboNavigator from './src/pages/weibo/navigator';
import ChildrenNavigator from './src/pages/children/navigator';
import ToolNavigator from './src/pages/tool/navigator';

enableScreens();

const Stack = createNativeStackNavigator();

export default function App() {
    return (
        <SafeAreaProvider>
            <SettingProvider>
                <ToastProvider>
                    <LoadingProvider>
                        <NavigationContainer>
                            <Stack.Navigator initialRouteName="IndexNavigator" screenOptions={{ headerShown: false }}>
                                <Stack.Screen name="IndexNavigator" component={IndexNavigator} />
                                <Stack.Screen name="ExerciseNavigator" component={ExerciseNavigator} />
                                <Stack.Screen name="WeiboNavigator" component={WeiboNavigator} />
                                <Stack.Screen name="ChildrenNavigator" component={ChildrenNavigator} />
                                <Stack.Screen name="ToolNavigator" component={ToolNavigator} />
                            </Stack.Navigator>
                        </NavigationContainer>
                    </LoadingProvider>
                </ToastProvider>
            </SettingProvider>
        </SafeAreaProvider>
    );
}
