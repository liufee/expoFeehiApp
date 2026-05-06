import React from 'react';
import {View, StyleSheet} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import WeiboService from '../../service/weibo';
import Composer from './components/Composer';
import {useSetting} from '../../provider/setting';
import {AppWeiboBasePath} from '../../../constants';

export default function Repost() {
    const params = useLocalSearchParams();

    const uid = params.uid as string || '0';
    const repostWeibo = params.repostWeibo ? JSON.parse(params.repostWeibo as string) : null;

    const weiboService:WeiboService = WeiboService.getInstance();

    const {setting} = useSetting();

    return (
        <View style={styles.container}>
            <Composer
                uid={uid}
                draftFile={AppWeiboBasePath + '/draft'}
                setting={setting}
                weiboService={weiboService}
                repostWeibo={repostWeibo}
                onPosted={async () => {
                    // 转发成功后返回
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {flex: 1, backgroundColor: '#f7f7f7', padding: 10},
});
