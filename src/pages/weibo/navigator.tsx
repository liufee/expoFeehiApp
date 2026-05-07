import React, {useEffect, useState} from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createStackNavigator} from '@react-navigation/stack';
import {useSetting} from '../../provider/setting';
import { IconSymbol } from '@/components/ui/icon-symbol';
import WeiboService, {NewsService} from '../../service/weibo';
import AiScreen from './index';
import HotSearchScreen from './HotSearchScreen';
import WeiboIndex,{tabPressEmitter} from './index';
import WeiboDetail from './detail';
import WeiboSearch from './search';
import TSRVerify from './TSRVerify';
import Repost from './repost';
import {ActivityIndicator, Text, View} from "react-native";

const Tab = createBottomTabNavigator();

const WeiboNavigator = () => {
    const [loading, setLoading] = useState<boolean>(true);

    const {setting} = useSetting();

    useEffect(()=>{
        const init = async () => {
            await WeiboService.init(setting);
            await NewsService.init(setting);
            setLoading(false);
        };
       init();
    }, []);

    if(loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
                <Text style={{ marginTop: 10 }}>加载中...</Text>
            </View>
        )
    }

    return (
        <Tab.Navigator>
            <Tab.Screen name="hotSearchList" component={HotSearchScreen} options={{
                tabBarLabel: '热搜',
                title: '热搜',
                headerShown:false,
                tabBarIcon: ({ color }) => (
                    <IconSymbol size={28} name="search" color={color} />
                ),
            }} />
            <Tab.Screen  name="index" component={WeiboIndexStack} options={{
                tabBarIcon: ({ color }) => (
                    <IconSymbol size={28} name="sina.weibo" color={color} />
                ),
                tabBarLabel: '微博',
                title:'微博',
                headerShown:false,
            }}
             listeners={({ navigation }) => ({
                 tabPress: () => {
                     if (navigation.isFocused()) {
                         tabPressEmitter.emit('refresh');
                     }
                 },
             })}
            />
            <Tab.Screen  name="search" component={WeiboSearchStack} options={{
                tabBarIcon: ({ color }) => (
                    <IconSymbol size={28} name="search" color={color} />
                ),
                tabBarLabel: '搜索',
                title:'搜索',
                headerShown:false,
            }} />
        </Tab.Navigator>
    );
};

const Stack = createStackNavigator();
const WeiboIndexStack = ()=> {
    return (
        <Stack.Navigator>
            <Stack.Screen options={{ headerShown:false}} name="Index" component={WeiboIndex}/>
            <Stack.Screen options={{ headerShown:false}} name="WeiboDetail" component={WeiboDetail}/>
            <Stack.Screen options={{ headerShown:false}} name="Repost" component={Repost}/>
            <Stack.Screen options={{ headerShown:false}} name="TSRVerify" component={TSRVerify}/>
        </Stack.Navigator>
    );
};

const WeiboSearchStack = ()=> {
    return (
        <Stack.Navigator>
            <Stack.Screen options={{ headerShown:false}} name="Search" component={WeiboSearch}/>
            <Stack.Screen options={{ headerShown:false}} name="WeiboDetail" component={WeiboDetail}/>
            <Stack.Screen options={{ headerShown:false}} name="Repost" component={Repost}/>
            <Stack.Screen options={{ headerShown:false}} name="TSRVerify" component={TSRVerify}/>
        </Stack.Navigator>
    );
};

export default WeiboNavigator;

