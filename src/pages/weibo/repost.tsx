import React from 'react';
import {View, StyleSheet} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import WeiboService from '../../service/weibo';
import Composer from './components/Composer';
import {useSetting} from '../../provider/setting';
import {AppWeiboBasePath} from '../../../constants';

export default function Repost({ route }: any) {
    const { uid: uidParam, repostWeibo: repostWeiboParam } = route.params || {};
    const uid = uidParam || '0';
    const repostWeibo = repostWeiboParam || null;

    const weiboService:WeiboService = WeiboService.getInstance();

    const {setting} = useSetting();
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
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
