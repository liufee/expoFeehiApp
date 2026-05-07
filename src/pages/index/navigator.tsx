import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import IndexScreen from './IndexScreen';

const Stack = createStackNavigator();

const IndexNavigator = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Index" component={IndexScreen} />
        </Stack.Navigator>
    );
};

export default IndexNavigator;
