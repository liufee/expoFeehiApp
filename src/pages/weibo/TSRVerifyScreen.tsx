import React from 'react';
import {Comment, Weibo} from '../../service/weibo/model';
import WeiboService from '../../service/weibo';
import TsrVerify from '../../util/tsr';
import { useLocalSearchParams } from 'expo-router';

const TSRVerifyScreen = () => {
    const params = useLocalSearchParams();
    const type = params.type as string;
    const weibo = params.weibo ? JSON.parse(params.weibo as string) : null;
    const comment = params.comment ? JSON.parse(params.comment as string) : null;

    const weiboService = WeiboService.getInstance();

    const formula = type === 'feed' ? 'time+content+base64_medias' : 'time+content+base64_medias';
    const createdAt = type === 'feed' ? weibo?.createdAt : comment?.createdAt;
    const id = type === 'feed' ? weibo?.id : comment?.id;

    return <TsrVerify formula={formula} createdAt={createdAt}
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
    ></TsrVerify>;
};

export default TSRVerifyScreen;
