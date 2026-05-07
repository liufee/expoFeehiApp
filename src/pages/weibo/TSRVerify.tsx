import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {Comment, Weibo} from '../../service/weibo/model';
import WeiboService from '../../service/weibo';
import TsrVerify from '../../components/tsrVerify';

const TSRVerify = ({ route }: any) => {
    const insets = useSafeAreaInsets();
    const { type, weibo, comment } = route.params || {};

    const weiboService = WeiboService.getInstance();

    const formula = type === 'feed' ? 'time+content+base64_medias' : 'time+content+base64_medias';
    const createdAt = type === 'feed' ? weibo?.createdAt : comment?.createdAt;
    const id = type === 'feed' ? weibo?.id : comment?.id;

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <TsrVerify formula={formula} createdAt={createdAt}
                getFullOriginalString={
                    async ()=>{
                        const data = type === 'feed' ? weibo : comment;
                        const [success, result] = await weiboService.assembleStrToCreateTSR(type, data);
                        if(success){
                            return [true, result, ''];
                        }else{
                            return [false, '', result];
                        }
                    }
                }
                getTSR={
                    async ()=>{
                        const [success, tsr, err] = await weiboService.getTSR(type, id);
                        if(success){
                            return [true, tsr.tsr, ''];
                        }else{
                            return [false, '', err];
                        }
                    }
                }
            ></TsrVerify>
        </View>
    );
};

export default TSRVerify;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
