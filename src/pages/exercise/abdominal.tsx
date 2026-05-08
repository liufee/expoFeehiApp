import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VideoView, useVideoPlayer } from 'expo-video';
import { format, parse, addMinutes } from 'date-fns';
import { exerciseService } from '@/src/service/exercise/exercise';
import { Record, RecordType, Status } from '@/src/service/exercise/model';
import * as FileSystem from 'expo-file-system/legacy';
import {APPRuntimePath} from "@/constants";

const { width } = Dimensions.get('window');

const actions = [
    { description: '1-1', start: 4.5, end: 55, name: '瑜伽垫辅助卷腹', duration: 50 },
    { description: '1-2', start: 67, end: 103, name: '反向屈体转腹', duration: 36 },
    { description: '1-3', start: 115.5, end: 149, name: '简易俄罗斯转体', duration: 33 },
    { description: '1-4', start: 171.5, end: 201, name: '左侧屈膝', duration: 30 },
    { description: '1-5', start: 213, end: 240, name: '右侧屈膝', duration: 30 },
    { description: '1-6', start: 243.5, end: 272, name: '腹部拉升', duration: 30 },
    { description: '2-1', start: 283.5, end: 334.5, name: '瑜伽垫辅助卷腹', duration: 50 },
    { description: '2-2', start: 346.5, end: 382.5, name: '反向屈体转腹', duration: 36 },
    { description: '2-3', start: 395.5, end: 429, name: '简易俄罗斯转体', duration: 33 },
    { description: '2-4', start: 451.5, end: 490, name: '平板支撑', duration: 38 },
    { description: '2-5', start: 492.5, end: 521, name: '腹部拉升', duration: 30 },
    { description: '3-1', start: 532.5, end: 583, name: '瑜伽垫辅助卷腹', duration: 50 },
    { description: '3-2', start: 595.5, end: 632, name: '反向屈体转腹', duration: 36 },
    { description: '3-3', start: 644.5, end: 678, name: '简易俄罗斯转体', duration: 33 },
    { description: '3-4', start: 700, end: 730, name: '平板支撑交替抬腿', duration: 30 },
    { description: '3-5', start: 733.5, end: 762, name: '真空腹训练', duration: 30 },
];

export default function AbdominalScreen() {
    const insets = useSafeAreaInsets();
    const [paused, setPaused] = useState(true);
    const [muted, setMuted] = useState(false);
    const [showSkipRest, setShowSkipRest] = useState(false);
    const [currentAction, setCurrentAction] = useState(-1);
    const [startAt, setStartAt] = useState<Date | null>(null);
    const startAtRef = useRef<Date | null>(null); // 使用 ref 存储开始时间以避免异步问题
    const [list, setList] = useState<Record[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingText, setLoadingText] = useState('视频下载中...');
    const [showRetry, setShowRetry] = useState(false);
    const [videoUri, setVideoUri] = useState<string | null>(null);
    const [saving, setSaving] = useState(false); // 保存时的 loading 状态
    const hasEnded = useRef(false);

    // 使用 expo-video 的 player
    const player = useVideoPlayer(videoUri || '', (player) => {
        player.loop = false;
        player.muted = muted;
        player.timeUpdateEventInterval = 0.5; // 设置时间更新间隔为 0.5 秒
    });

    // 当视频URI设置后，延迟设置初始位置到第3秒
    useEffect(() => {
        if (videoUri && player && !hasEnded.current) {
            // 延迟设置 currentTime，确保视频元数据已加载
            const timer = setTimeout(() => {
                try {
                    player.currentTime = 3;
                } catch (e) {
                }
            }, 300);

            return () => clearTimeout(timer);
        }
    }, [videoUri, player]);

    const VIDEO_URL = 'https://img-1251086492.cos.ap-guangzhou.myqcloud.com/feehiapp/videos/keep_1_1.mp4';

    const refreshRecords = async () => {
        try {
            const [success, rows, error] = await exerciseService.getRecordsByPage([RecordType.RecordTypeAbdominal], 1, 12, '', '', 'desc');
            if (!success) {
                Alert.alert('失败', error);
                return;
            }
            const records = rows.map((row: any) => {
                return {
                    id: row.id,
                    type: row.type,
                    startAt: row.start_at,
                    endAt: row.end_at,
                    status: row.status,
                    abdominal: {},
                    run: {} as any,
                    sitUpPushUp: {} as any,
                    tsr: row.tsr || 0,
                    tsrVerified: 1,
                };
            });
            setList(records);
        } catch (error) {
            console.error('获取腹肌记录失败:', error);
            Alert.alert('失败', '获取记录失败');
        }
    };

    const initializeVideo = async () => {
        const remoteUrl = VIDEO_URL;
        const dirPath = `${APPRuntimePath}`;
        const localPath = `${dirPath}/keep_1_1.mp4`;
        const tempPath = `${localPath}.tmp`;

        setShowRetry(false);
        setLoading(true);
        setLoadingText('视频下载中...');

        try {

            if (!dirInfo.exists) {
                await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
            }
            if (fileInfo.exists) {
                setVideoUri(localPath);
                setLoading(false);
            } else {
                // 删除可能存在的临时文件
                const tempInfo = await FileSystem.getInfoAsync(tempPath);
                if (tempInfo.exists) {
                    await FileSystem.deleteAsync(tempPath);
                }
                // 下载视频 - 使用 downloadResumable 支持进度跟踪
                const downloadResumable = FileSystem.createDownloadResumable(
                    remoteUrl,
                    tempPath,
                    {},
                    (downloadProgress) => {
                        const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
                        const percent = (progress * 100).toFixed(0);

                        setLoadingText(`视频下载中... ${percent}%`);
                    }
                );

                const downloadResult = await downloadResumable.downloadAsync();
                if (downloadResult && downloadResult.uri) {
                    await FileSystem.moveAsync({ from: tempPath, to: localPath });
                    if (finalFileInfo.exists) {
                        setVideoUri(localPath);
                        setLoading(false);
                    } else {
                        setLoadingText('文件保存失败');
                        setShowRetry(true);
                    }
                } else {
                    setLoadingText('下载失败');
                    setShowRetry(true);
                    // 清理临时文件
                    const tempInfoAfter = await FileSystem.getInfoAsync(tempPath);
                    if (tempInfoAfter.exists) {
                        await FileSystem.deleteAsync(tempPath);
                    }
                }
            }
        } catch (error) {
            setLoadingText(`下载失败: ${error.message || '未知错误'}`);
            setShowRetry(true);
            // 清理临时文件
            try {
                const tempInfo = await FileSystem.getInfoAsync(tempPath);
                if (tempInfo.exists) {
                    await FileSystem.deleteAsync(tempPath);
                }
            } catch (e) {
            }
        }
    };

    useEffect(() => {
        initializeVideo();
        refreshRecords();
        return () => {
            // 清理播放器
            /*if (player) {
                player.pause();
            }*/
            // 重置结束标志
            hasEnded.current = false;
        };
    }, []);

    const handlePlayPause = () => {
        if (paused) {
            player?.play();
        } else {
            player?.pause();
        }
        setPaused(!paused);
        if (currentAction === -1) {
            setCurrentAction(0);
            const newStartAt = new Date();
            setStartAt(newStartAt);
            startAtRef.current = newStartAt; // 同时更新 ref
            hasEnded.current = false;
        }
    };

    const handleNextAction = () => {
        if (currentAction < actions.length - 1 && currentAction !== -1 && player) {
            const nextActionIndex = currentAction + 1;
            const nextStartTime = actions[nextActionIndex].start;
            setShowSkipRest(false);
            player.currentTime = nextStartTime;
            setCurrentAction(nextActionIndex);
        }
    };

    const handlePrevAction = () => {
        if (currentAction > 0 && currentAction !== -1 && player) {
            const prevActionIndex = currentAction - 1;
            const prevStartTime = actions[prevActionIndex].start;
            setShowSkipRest(false);
            player.currentTime = prevStartTime;
            setCurrentAction(prevActionIndex);
        }
    };

    const handleProgress = ({ positionMillis }: { positionMillis: number }) => {
        const currentTime = positionMillis / 1000;
        for (let i = 0; i < actions.length - 1; i++) {
            if (currentTime > actions[i].end && currentTime < actions[i + 1].start - 2) {
                // 在第一个结尾，第二个开始之前
                if (i === 4 || i === 9 || i === 14) {
                    // 无休息
                    return;
                }
                setShowSkipRest(true);
            } else if (Math.floor(currentTime) === Math.floor(actions[i].start - 2)) {
                // 等于该开始的节点
                setShowSkipRest(false);
                setCurrentAction(i);
            }
        }
    };

    // 监听播放器状态
    useEffect(() => {
        if (!player) return;
        // iOS 和 Android 通用：监听视频播放完成事件（最可靠的方式）
        const playToEndSubscription = player.addListener('playToEnd', () => {
            handleEnd();
        });

        const timeUpdateSubscription = player.addListener('timeUpdate', ({ currentTime }) => {
            handleProgress({ positionMillis: currentTime * 1000 });
        });

        return () => {
            playToEndSubscription.remove();
        };
    }, [player, currentAction]);

    // 监听静音状态变化
    useEffect(() => {
        if (player) {
            player.muted = muted;
        }
    }, [muted, player]);

    const saveAbdominalRecord = async (status: Status) => {
        if (hasEnded.current) return true;
        if (saving) return false; // 如果正在保存，直接返回

        // 优先使用 ref 中的值，因为它能立即更新，如果 ref 中没有则使用 state
        const actualStartAt = startAtRef.current || startAt;

        // 确保 startAt 已设置，如果未设置则返回错误
        if (!actualStartAt) {

            Alert.alert('错误', '开始时间未设置，请重新开始锻炼');
            return false;
        }

        setSaving(true); // 开始保存，设置 loading 状态
        const endAt = new Date();

        const record = {
            type: RecordType.RecordTypeAbdominal,
            startAt: format(actualStartAt, 'yyyy-MM-dd HH:mm:ss'),
            endAt: format(endAt, 'yyyy-MM-dd HH:mm:ss'),
            abdominal: {} as any,
            run: {} as any,
            status: status,
            sitUpPushUp: {} as any,
        };

        try {
            const [success, error] = await exerciseService.saveRecord(record);
            if (!success) {
                Alert.alert('失败', error);
                return false;
            }
            setCurrentAction(-1);
            setPaused(true);
            try {
                if (player) {
                    player.pause();
                    player.currentTime = 3; // 重置到3秒
                }
            } catch (e) {
            }
            setShowSkipRest(false);
            // 移除这里的 hasEnded.current = true，移到 handleEnd 中统一设置
            await refreshRecords();
            return true;
        } catch (error) {
            Alert.alert('失败', '保存记录失败');
            return false;
        } finally {
            setSaving(false); // 保存完成，取消 loading 状态
        }
    };

    const autoSaveSitUpPushUpRecord = async () => {
        if (saving) {
            return;
        }
        const endAt = new Date();
        const record = {
            type: RecordType.RecordTypeSitUpPushUp,
            startAt: format(addMinutes(endAt, 10), 'yyyy-MM-dd HH:mm:ss'),
            endAt: format(addMinutes(endAt, 90), 'yyyy-MM-dd HH:mm:ss'),
            abdominal: {} as any,
            run: {} as any,
            status: Status.StatusFinished,
            sitUpPushUp: {
                sitUp: 520,
                pushUp: 130,
                curlUp: 117,
                legsUpTheWallPose: 3,
            },
        };
        setSaving(true); // 开始保存
        try {
            const [success, error] = await exerciseService.saveRecord(record);
            if (!success) {
                Alert.alert('失败', error);
                return;
            }
            await refreshRecords();
            Alert.alert('成功', '保存成功');
        } catch (error) {
            Alert.alert('失败', '保存记录失败');
        } finally {
            setSaving(false); // 保存完成
        }
    };

    const handleEnd = async () => {
        if (hasEnded.current || saving) {
            return;
        }
        // 先保存腹肌记录（不设置 hasEnded）
        await saveAbdominalRecord(Status.StatusFinished);
        // 再保存力量记录
        await autoSaveSitUpPushUpRecord();
        // 最后设置结束标志
        hasEnded.current = true;
    };

    const handleManualEnd = async () => {
        if (saving) return; // 如果正在保存，直接返回
        await saveAbdominalRecord(Status.StatusUndone);
    };

    const reset = () => {
        if (!paused) return;
        if (!startAt || currentAction === -1) return;
        setPaused(true);
        try {
            if (player) {
                player.pause();
                player.currentTime = 3; // 重置到3秒
            }
        } catch (e) {
        }
        setCurrentAction(-1);
        setStartAt(null);
        startAtRef.current = null; // 同时重置 ref
        setShowSkipRest(false);
        hasEnded.current = false;
    };

    return (
        <ScrollView style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }]} contentContainerStyle={styles.scrollContent}>
            {/* 加载状态 */}
            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#007bff" />
                    <Text style={styles.loadingText}>{loadingText}</Text>
                    {showRetry && (
                        <TouchableOpacity onPress={initializeVideo} style={styles.retryButton}>
                            <Text style={styles.retryButtonText}>重试</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* 视频播放器 */}
            {!loading && videoUri && (
                <View style={styles.videoContainer}>
                    <VideoView
                        player={player}
                        style={styles.video}
                        allowsFullscreen
                        allowsPictureInPicture
                        nativeControls={false}
                    />
                </View>
            )}

            <View style={styles.content}>
                {/* 保存时锁定整个页面的遮罩层 */}
                {saving && (
                    <View style={styles.savingOverlay}>
                        <ActivityIndicator size="large" color="#007bff" />
                    </View>
                )}

                <Text style={styles.title}>
                    {currentAction > -1 ? actions[currentAction].description + ' ' : ''}
                    {actions[currentAction]?.name || '开始锻炼'}
                </Text>
                <Text style={styles.description}>
                    {actions[currentAction] ? `持续时间：${actions[currentAction].duration}秒` : '准备开始锻炼'}
                </Text>

                <View style={styles.buttonsContainer}>
                    <TouchableOpacity
                        onPress={handlePlayPause}
                        style={{ ...styles.button, backgroundColor: paused ? '#F59E0B' : '#2563EB' }}
                        onLongPress={reset}>
                        <Text style={styles.buttonText}>{paused ? (currentAction === -1 ? '开始' : '继续') : '暂停'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        disabled={currentAction <= 0 || currentAction === -1}
                        onPress={handlePrevAction}
                        style={{ ...styles.button, backgroundColor: currentAction <= 0 || currentAction === -1 ? '#9CA3AF' : '#475569' }}>
                        <Text style={styles.buttonText}>上个</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        disabled={currentAction >= actions.length - 1 || currentAction === -1}
                        onPress={handleNextAction}
                        style={{
                            ...styles.button,
                            backgroundColor: currentAction >= actions.length - 1 || currentAction === -1 ? '#9CA3AF' : '#475569',
                        }}>
                        <Text style={styles.buttonText}>下个</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        disabled={!showSkipRest}
                        onPress={handleNextAction}
                        style={{ ...styles.button, backgroundColor: showSkipRest ? '#475569' : '#9CA3AF' }}>
                        <Text style={styles.buttonText}>跳休</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setMuted(!muted)}
                        style={{ ...styles.button, backgroundColor: muted ? '#6B7280' : '#7C3AED' }}>
                        <Text style={styles.buttonText}>{muted ? '静音' : '声音'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        disabled={paused || hasEnded.current || currentAction === -1 || saving} // 保存时禁用按钮
                        onPress={handleManualEnd}
                        style={{
                            ...styles.button,
                            backgroundColor: (paused || hasEnded.current || currentAction === -1 || saving) ? '#9E9E9E' : '#16A34A',
                        }}>
                        <Text style={styles.buttonText}>完成</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.logContainer}>
                    <Text style={styles.logTitle}>最近12天的锻炼记录</Text>
                    <ScrollView style={styles.scrollLog}>
                        {list.map((log: Record, index) => {
                            const startTime = parse(log.startAt, 'yyyy-MM-dd HH:mm:ss', new Date());
                            const endTime = parse(log.endAt, 'yyyy-MM-dd HH:mm:ss', new Date());
                            return (
                                <Text key={index} style={styles.logEntry}>
                                    {format(startTime, 'yyyy-MM-dd')} - 从 {format(startTime, 'HH:mm:ss')} 到{' '}
                                    {format(endTime, 'HH:mm:ss')}
                                </Text>
                            );
                        })}
                    </ScrollView>
                </View>
            </View>
            </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9f9f9',
    },
    scrollContent: {
        flexGrow: 1,
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        zIndex: 1000,
    },
    retryButton: {
        marginTop: 15,
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: '#007bff',
        borderRadius: 5,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    videoContainer: {
        width: width,
        height: width * 9 / 16,
        backgroundColor: '#000',
    },
    video: {
        width: '100%',
        height: '100%',
    },
    content: {
        padding: 15,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    description: {
        fontSize: 16,
        color: '#555',
        marginBottom: 20,
    },
    buttonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    button: {
        backgroundColor: '#4CAF50',
        padding: 10,
        borderRadius: 5,
        flex: 1,
        marginHorizontal: 2,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: 'bold',
    },
    logContainer: {
        marginTop: 5,
    },
    logTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    scrollLog: {
        maxHeight: 300,
    },
    logEntry: {
        fontSize: 14,
        color: '#333',
        marginBottom: 5,
    },
    savingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        zIndex: 999,
    },
});
