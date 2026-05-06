import React, {useState, useEffect, useRef} from 'react';
import {
    View,
    FlatList,
    Text,
    StyleSheet,
    Alert,
    TouchableWithoutFeedback,
    Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {WeiboItem} from './components/WeiboItem';
import WeiboService, {NewsService} from '../../service/weibo';
import EventEmitter from 'react-native/Libraries/vendor/emitter/EventEmitter';
import {getEnabledUsers} from '../../service/weibo/data';
import {AppWeiboBasePath} from '../../../constants';
import Composer from './components/Composer';
import {Weibo} from '../../service/weibo/model';
import {useSetting} from '../../provider/setting';
import {Picker} from '../../components/picker';

export const tabPressEmitter = new EventEmitter();
const draftFile = AppWeiboBasePath + '/draft';
const limit = 10;

const WeiboIndex = ({}) => {
    const insets = useSafeAreaInsets();
    const { setting } = useSetting();

    const [weibos, setWeibos] = useState<Weibo[]>([]); // 微博列表
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [topIsLoading, setTopIsLoading] = useState(false);
    const [uid, setUid] = useState<string>(setting.weibo.defaultUser); // 当前选择的用户名
    const weiboListRef = useRef<FlatList<any>|null>(null);

    const enabledUsers = getEnabledUsers(setting.weibo.enabledUsers, setting.weibo.anonymous);

    const weiboService = WeiboService.getInstance();
    const newsService = NewsService.getInstance();

    useEffect(() => {
        // 设置 weiboService 的 setting
        weiboService.setSetting(setting);
    }, [setting]);

    useEffect(() => {
        const refreshListener = async() => {
            weiboListRef.current?.scrollToOffset({ animated: true, offset: 0 });
            await loadNews();
        };
        tabPressEmitter.addListener('refresh', refreshListener);

        const init = async() => {
            loadMoreWeibos();
            loadNews();
        };
        init();
        return () => {
            tabPressEmitter.removeAllListeners('refresh');
        };
    }, [loadNews, loadMoreWeibos]);
    const loadNews = async() => {
        if (topIsLoading) {
            return;
        }
        setTopIsLoading(true);
        const [result, news, err] = await newsService.getNews();
        if (!result) {
            Alert.alert('失败', err);
            setTopIsLoading(false);
            return;
        }
        setWeibos((prevWeibos) => [...news, ...prevWeibos.filter(item => item.type !== 3)]);
        setTopIsLoading(false);
    };

    const loadMoreWeibos = async() => {
        if (isLoading) {
            return;
        }
        setIsLoading(true);
        const [result, newWeibos, err] = await weiboService.getWeiboByPage(uid, page, (page - 1) * limit, limit);
        if(!result) {
            setIsLoading(false);
            Alert.alert('失败', err);
            return;
        }
        setWeibos((prevWeibos) =>[...prevWeibos, ...newWeibos.filter(item2 => !prevWeibos.some(item1 => item1.id === item2.id))]);
        setPage(page + 1);
        setIsLoading(false);
    };

    // 账号切换
    const handleUsernameChange = async (selectedUid:string) => {
        setUid(selectedUid);
        const [result, newWeibos, err] = await weiboService.getWeiboByPage(selectedUid, 1, 0, limit);
        if(!result) {
            setIsLoading(false);
            Alert.alert('失败', err);
            return;
        }
        setWeibos(newWeibos);
        setPage(2);
    };

    const onDeleteWeibo = (weibo:Weibo) => {
        setWeibos((prevWeibos) => prevWeibos.filter((item) => item.id !== weibo.id));
    };

    const handleScroll = async (event) => {
        // 判断是否滚动到顶部
        const offsetY = event.nativeEvent.contentOffset.y;
        if (offsetY <= 0 && !isLoading) {
            await loadNews();
        }
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
                {/* 账号切换 */}
                <View style={styles.usernameContainer}>
                    <Picker
                        selectedValue={uid}
                        onValueChange={handleUsernameChange}
                        items={[{'name': '全部', 'value': '0'}, ...enabledUsers.map(user => ({'name': user.name, 'value': user.id}))]}
                        placeholder="选择账号"
                        style={{width:80}}
                        textStyle={{fontSize: 12,margin:0,padding:0}}
                        buttonStyle={{paddingHorizontal:1,paddingVertical:1}}
                    />
                </View>
                {/* 发布微博区域 */}
                <Composer
                    uid={uid}
                    draftFile={draftFile}
                    setting={setting}
                    weiboService={weiboService}
                    quoteWeibo={null}
                    onPosted={async () => {
                        const [getResult, newWeibos, errGetWeibo] = await weiboService.getWeiboByPage(
                            uid,
                            1,
                            0,
                            limit,
                        );
                        if (!getResult) {
                            Alert.alert('失败', errGetWeibo);
                            return;
                        }
                        setWeibos(newWeibos);
                        setPage(2);
                    }}
                />
                {topIsLoading && <Text style={styles.loadingText}>加载中...</Text>}
                {/* 微博列表 */}
                <FlatList
                    ref={weiboListRef}
                    data={weibos}
                    renderItem={
                        (info) =>
                            <WeiboItem item={info.item} uid={uid} onDelete={onDeleteWeibo}
                            refresh={
                                async()=>{
                                    const[result, newWeibos, err] = await weiboService.getWeiboByPage(uid, 1, 0, limit)
                                    if(!result){
                                        Alert.alert('失败', err);
                                        return;
                                    }
                                    setWeibos(newWeibos);
                                }
                            }
                    />}
                    onEndReached={loadMoreWeibos}
                    onEndReachedThreshold={0.1}
                    onScroll={handleScroll}
                />

                {/* 加载中状态 */}
                {isLoading && <Text style={styles.loadingText}>加载中...</Text>}
            </View>
        </TouchableWithoutFeedback>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 10,
    },
    usernameContainer: {
        zIndex: 111,
        position: 'absolute',
        right: 10,
        top: 30,
    },
    loadingText: {
        textAlign: 'center',
        padding: 10,
        color: '#888',
    },
});

export default WeiboIndex;
