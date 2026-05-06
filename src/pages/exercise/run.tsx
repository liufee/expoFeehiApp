import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  PanResponder,
  Platform,
} from 'react-native';
// 条件导入 react-native-maps，仅在非 Web 平台
let MapView: any;
let Polyline: any;
let Marker: any;

if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Polyline = Maps.Polyline;
  Marker = Maps.Marker;
}
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, parse, isValid } from 'date-fns';
import { exerciseService } from '@/src/service/exercise/exercise';
import { RecordType, Status, Path } from '@/src/service/exercise/model';
import { formatTime, haversineDistance, formatTimestamp, calculateSegments, calculateAverageSpeed } from './utils';

const PROGRESS_KEY_LAST_HAND_INPUT_START_TIME = 'last_hand_input_run_start_time';

export default function RunScreen() {
  const [running, setRunning] = useState(false);
  const [path, setPath] = useState<Path[]>([]);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [distance, setDistance] = useState(0);
  const [runDuration, setRunDuration] = useState('00:00:00');
  const [avgPace, setAvgPace] = useState(0);
  const [segmentPace, setSegmentPace] = useState<Array<{ startTime: number; endTime: number; distance: number; avgPace: number }>>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showHandInput, setShowHandInput] = useState(false);
  const [handInputStartAt, setHandInputStartAt] = useState('');
  const [handInputEndAt, setHandInputEndAt] = useState('');
  const handInputDistance = 8.15;

  const [showAvgType, setShowAvgType] = useState(0);
  const allAvgPaceTypes = ['km/h', 'm/min', 'm/s'];

  const mapRef = useRef<MapView | null>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const distanceRef = useRef(distance);
  const lastPointRef = useRef<Path | null>(null);
  const showAvgTypeRef = useRef(showAvgType);
  const startY = useRef(0);
  const triggered = useRef(false);

  // 更新 distanceRef 和 showAvgTypeRef
  useEffect(() => {
    distanceRef.current = distance;
    showAvgTypeRef.current = showAvgType;
  }, [distance, showAvgType]);

  // 定时器更新跑步时长和平均配速
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined;
    if (running && startTime !== null) {
      intervalId = setInterval(() => {
        const now = Date.now();
        setRunDuration(formatTime(now - startTime));
        const avg = calculateAverageSpeed(distanceRef.current, now - startTime, showAvgTypeRef.current);
        setAvgPace(avg);
      }, 1000);
    }
    return () => clearInterval(intervalId);
  }, [running, startTime]);

  // 滑动手势识别器 - 用于切换速度单位
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // 只有垂直移动距离足够大时才响应，避免与地图水平拖动冲突
        return Math.abs(gestureState.dy) > 10;
      },
      onPanResponderGrant: (_, gestureState) => {
        startY.current = gestureState.y0;
        triggered.current = false;
        console.log('Pan start, y0:', gestureState.y0);
      },
      onPanResponderMove: (_, gestureState) => {
        console.log('Pan move, dy:', gestureState.dy);
      },
      onPanResponderRelease: (_, gestureState) => {
        const dy = gestureState.moveY - startY.current;
        console.log('Pan release, dy:', dy, 'current showAvgType:', showAvgTypeRef.current);
        if (!triggered.current) {
          let newAvgType = showAvgTypeRef.current;
          if (dy < -30) {
            // 向上滑动 - 循环切换下一个单位
            newAvgType = (newAvgType + 1) % 3;
            console.log('Switch to next:', newAvgType, allAvgPaceTypes[newAvgType]);
          } else if (dy > 30) {
            // 向下滑动 - 循环切换上一个单位
            newAvgType = (newAvgType - 1 + 3) % 3;
            console.log('Switch to prev:', newAvgType, allAvgPaceTypes[newAvgType]);
          }
          setShowAvgType(newAvgType);
          triggered.current = true;
        }
      },
    })
  ).current;

  // 请求位置权限并开始定位
  const startLocationTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('错误', '需要位置权限才能记录跑步路线');
        return false;
      }

      // 开始监听位置变化
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        (location) => {
          const { latitude, longitude } = location.coords;
          const time = location.timestamp;
          handleLocationUpdate({ latitude, longitude, time });
        }
      );
      return true;
    } catch (error) {
      console.error('Failed to start location tracking:', error);
      Alert.alert('错误', '无法启动位置跟踪');
      return false;
    }
  };

  // 处理位置更新
  const handleLocationUpdate = (newPoint: Path) => {
    setPath((prevPath) => {
      const updatedPath = [...prevPath, newPoint];

      // 计算距离
      if (lastPointRef.current) {
        const segmentDistance = haversineDistance(
          { latitude: lastPointRef.current.latitude, longitude: lastPointRef.current.longitude },
          { latitude: newPoint.latitude, longitude: newPoint.longitude }
        );
        setDistance((prevDistance) => {
          const newDistance = prevDistance + segmentDistance;
          distanceRef.current = newDistance;
          return newDistance;
        });
      }

      lastPointRef.current = newPoint;

      // 移动地图相机到最新位置
      if (mapRef.current) {
        mapRef.current.animateCamera({
          center: { latitude: newPoint.latitude, longitude: newPoint.longitude },
        });
      }

      return updatedPath;
    });
  };

  // 开始跑步
  const startRun = async () => {
    const success = await startLocationTracking();
    if (!success) return;

    setRunning(true);
    setPath([]);
    setDistance(0);
    distanceRef.current = 0;
    lastPointRef.current = null;
    setStartTime(Date.now());
    setEndTime(null);
    setRunDuration('00:00:00');
    setAvgPace(0);
  };

  // 停止跑步
  const stopRun = async () => {
    // 停止位置跟踪
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }

    setRunning(false);
    const etime = Date.now();
    setEndTime(etime);

    // 计算最终的平均配速
    const tempAvgPace = calculateAverageSpeed(distance, etime - (startTime || 0), 0);
    setAvgPace(tempAvgPace);

    // 计算分段配速
    const segmentPaceData = path.length > 0 ? calculateSegments(path) : [];
    setSegmentPace(segmentPaceData);
    setShowSummary(true);
  };

  // 保存跑步记录
  const saveRun = async () => {
    if (saving) return;
    setSaving(true);

    try {
      const record = {
        id: '',
        type: RecordType.RecordTypeRun,
        startAt: format(startTime as number, 'yyyy-MM-dd HH:mm:ss'),
        endAt: format(endTime as number, 'yyyy-MM-dd HH:mm:ss'),
        abdominal: {} as any,
        run: {
          avgPace: avgPace,
          distance: distance,
          runDuration: runDuration,
          runningWithoutPosition: 0,
          paths: path,
        },
        status: Status.StatusFinished,
        sitUpPushUp: {} as any,
        tsr: 1,
        tsrVerified: 1,
      };

      const [success, message] = await exerciseService.saveRecord(record);

      if (!success) {
        Alert.alert('失败', message || '保存记录失败');
        return;
      }

      setShowSummary(false);
      Alert.alert('成功', '保存成功');

      // 重置状态
      setPath([]);
      setDistance(0);
      setStartTime(null);
      setEndTime(null);
      setRunDuration('00:00:00');
      setAvgPace(0);
      setSegmentPace([]);
    } catch (error) {
      console.error('Failed to save record:', error);
      Alert.alert('失败', '保存记录失败');
    } finally {
      setSaving(false);
    }
  };

  // 取消保存并关闭摘要
  const cancelSave = () => {
    setShowSummary(false);
    // 重置状态
    setPath([]);
    setDistance(0);
    setStartTime(null);
    setEndTime(null);
    setRunDuration('00:00:00');
    setAvgPace(0);
    setSegmentPace([]);
  };

  // 显示手动输入对话框
  const handleShowHandInput = async () => {
    try {
      const now = new Date();
      const nowStr = format(now, 'yyyy-MM-dd HH:mm:ss');

      // 获取上次打开对话框的时间
      const lastOpenTime = await AsyncStorage.getItem(PROGRESS_KEY_LAST_HAND_INPUT_START_TIME);

      // 立即保存当前时间为本次打开时间（供下次使用）
      await AsyncStorage.setItem(PROGRESS_KEY_LAST_HAND_INPUT_START_TIME, nowStr);

      if (lastOpenTime) {
        // 如果有上次打开的时间，用作开始时间
        const parsedDate = parse(lastOpenTime, 'yyyy-MM-dd HH:mm:ss', new Date());
        if (isValid(parsedDate)) {
          setHandInputStartAt(format(parsedDate, 'yyyy-MM-dd HH:mm:ss'));
        } else {
          // 如果解析失败，使用当前时间减去30分钟作为默认值
          const defaultStart = new Date(now.getTime() - 30 * 60 * 1000);
          setHandInputStartAt(format(defaultStart, 'yyyy-MM-dd HH:mm:ss'));
        }
      } else {
        // 如果没有历史记录，使用当前时间减去30分钟作为默认值
        const defaultStart = new Date(now.getTime() - 30 * 60 * 1000);
        setHandInputStartAt(format(defaultStart, 'yyyy-MM-dd HH:mm:ss'));
      }

      // 结束时间设置为当前时间
      setHandInputEndAt(nowStr);
      setShowHandInput(true);
    } catch (error) {
      console.error('Failed to load last input time:', error);
      // 出错时使用默认值
      const now = new Date();
      const nowStr = format(now, 'yyyy-MM-dd HH:mm:ss');
      const defaultStart = new Date(now.getTime() - 30 * 60 * 1000);
      setHandInputStartAt(format(defaultStart, 'yyyy-MM-dd HH:mm:ss'));
      setHandInputEndAt(nowStr);
      setShowHandInput(true);
    }
  };

  // 保存手动输入的记录
  const saveHandInput = async () => {
    if (saving) return; // 如果正在保存，直接返回

    // 验证开始时间
    let parsedDate = parse(handInputStartAt, 'yyyy-MM-dd HH:mm:ss', new Date());
    if (!isValid(parsedDate)) {
      Alert.alert('错误', '开始时间格式不正确: ' + handInputStartAt);
      return;
    }

    // 验证结束时间
    parsedDate = parse(handInputEndAt, 'yyyy-MM-dd HH:mm:ss', new Date());
    if (!isValid(parsedDate)) {
      Alert.alert('错误', '结束时间格式不正确: ' + handInputEndAt);
      return;
    }

    const parsedHandInputStartAt = parse(handInputStartAt, 'yyyy-MM-dd HH:mm:ss', new Date());
    const parsedHandInputEndAt = parse(handInputEndAt, 'yyyy-MM-dd HH:mm:ss', new Date());

    // 计算持续时间
    const duration = formatTime(parsedHandInputEndAt.getTime() - parsedHandInputStartAt.getTime());

    // 创建记录对象
    const record = {
      id: '',
      type: RecordType.RecordTypeRun,
      startAt: handInputStartAt,
      endAt: handInputEndAt,
      abdominal: {} as any,
      run: {
        avgPace: 0,
        distance: handInputDistance,
        runDuration: duration,
        runningWithoutPosition: 1,
        paths: [],
      },
      status: Status.StatusFinished,
      sitUpPushUp: {} as any,
      tsr: 1,
      tsrVerified: 1,
    };

    setSaving(true); // 开始保存
    try {
      const [success, message] = await exerciseService.saveRecord(record);

      if (!success) {
        Alert.alert('失败', message || '保存记录失败');
        return;
      }

      setShowHandInput(false);
      Alert.alert('成功', '保存成功');
    } catch (error) {
      console.error('Failed to save record:', error);
      Alert.alert('失败', '保存记录失败');
    } finally {
      setSaving(false); // 保存完成
    }
  };

  return (
    <View style={styles.container}>
      {/* 地图视图 - 仅在原生平台显示 */}
      {Platform.OS !== 'web' ? (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            latitude: 22.600995460902272,
            longitude: 113.8487422331694,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          showsUserLocation={true}
          followsUserLocation={running}
        >
          {path.length > 0 && (
            <>
              <Polyline
                coordinates={path.map((p) => ({
                  latitude: p.latitude,
                  longitude: p.longitude,
                }))}
                strokeColor="#007AFF"
                strokeWidth={4}
              />
              {path.length > 0 && (
                <Marker
                  coordinate={{
                    latitude: path[0].latitude,
                    longitude: path[0].longitude,
                  }}
                  title="起点"
                  pinColor="#4CAF50"
                />
              )}
              {!running && path.length > 0 && (
                <Marker
                  coordinate={{
                    latitude: path[path.length - 1].latitude,
                    longitude: path[path.length - 1].longitude,
                  }}
                  title="终点"
                  pinColor="#ff5722"
                />
              )}
            </>
          )}
        </MapView>
      ) : (
        /* Web 平台的替代显示 */
        <View style={styles.webMapPlaceholder}>
          <Text style={styles.webMapText}>🗺️ 地图功能</Text>
          <Text style={styles.webMapSubtext}>跑步路线追踪仅在移动设备上可用</Text>
          {path.length > 0 && (
            <Text style={styles.webMapInfo}>已记录 {path.length} 个位置点</Text>
          )}
        </View>
      )}

      {/* 信息面板 - 支持滑动切换速度单位 */}
      <View style={styles.infoPanel} {...panResponder.panHandlers}>
        <Text style={styles.infoText}>
          <Text style={styles.infoValue}>{runDuration}</Text>
          {' '}
          <Text style={styles.infoValue}>{distance.toFixed(2)} km</Text>
        </Text>
        <Text style={styles.infoText}>
          <Text style={styles.infoValue}>{avgPace.toFixed(2)} {allAvgPaceTypes[showAvgType]}</Text>
        </Text>
      </View>

      {/* 控制按钮 */}
      {running ? (
        <TouchableOpacity
          style={[styles.button, styles.stopButton]}
          onPress={() => {
            Alert.alert('确认？', '确定完成？', [
              { text: '继续', style: 'cancel' },
              { text: '确认', onPress: stopRun },
            ]);
          }}
        >
          <Text style={styles.buttonText}>完成跑步</Text>
        </TouchableOpacity>
      ) : (
        <>
          <TouchableOpacity
            style={[styles.button, styles.startButton]}
            onPress={startRun}
          >
            <Text style={styles.buttonText}>开始跑步</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.handInputButton, styles.manualButton]}
            onPress={handleShowHandInput}
          >
            <Text style={styles.handInputButtonText}>手动录入</Text>
          </TouchableOpacity>
        </>
      )}

      {/* 跑步摘要模态框 */}
      <Modal visible={showSummary} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>恭喜完成</Text>
            <Text style={styles.modalText}>耗时: {runDuration}</Text>
            <Text style={styles.modalText}>总距离: {distance.toFixed(2)} km</Text>
            <Text style={styles.modalText}>平均配速: {avgPace.toFixed(2)} km/h</Text>

            <Text style={styles.modalText}>分段配速:</Text>
            <ScrollView style={styles.segmentScrollView}>
              {segmentPace.length > 0 ? (
                segmentPace.map((segment, index) => (
                  <Text key={index} style={styles.modalText}>
                    {formatTimestamp(segment.startTime)} -{' '}
                    {formatTimestamp(segment.endTime)} ({((segment.endTime - segment.startTime) / (1000 * 60)).toFixed(0)} min) :{' '}
                    <Text style={styles.paceText}>{segment.avgPace.toFixed(2)} km/h</Text>
                  </Text>
                ))
              ) : (
                <Text style={styles.modalText}>
                  {startTime && formatTimestamp(startTime)}-{endTime && formatTimestamp(endTime)} ({endTime && startTime ? ((endTime - startTime) / (1000 * 60)).toFixed(0) : 0} min) :{' '}
                  <Text style={styles.paceText}>{avgPace.toFixed(2)} km/h</Text>
                </Text>
              )}
            </ScrollView>
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={cancelSave}
              >
                <Text style={styles.buttonText}>关闭</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={saveRun}
                disabled={saving}
              >
                <Text style={styles.buttonText}>{saving ? '保存中...' : '保存'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 手动输入对话框 */}
      <Modal visible={showHandInput} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>手动录入跑步记录</Text>

            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>开始时间：</Text>
              <TextInput
                style={styles.input}
                value={handInputStartAt}
                onChangeText={setHandInputStartAt}
                placeholder="yyyy-MM-dd HH:mm:ss"
              />
            </View>

            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>结束时间：</Text>
              <TextInput
                style={styles.input}
                value={handInputEndAt}
                onChangeText={setHandInputEndAt}
                placeholder="yyyy-MM-dd HH:mm:ss"
              />
            </View>

            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>距离（km）：</Text>
              <Text style={styles.distanceText}>{handInputDistance}</Text>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                disabled={saving}
                style={[styles.modalButton, styles.cancelButton, saving && { opacity: 0.5 }]}
                onPress={() => setShowHandInput(false)}
              >
                <Text style={styles.buttonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={saving}
                style={[styles.modalButton, saving && { opacity: 0.5 }]}
                onPress={saveHandInput}
              >
                <Text style={styles.buttonText}>{saving ? '保存中...' : '保存'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  webMapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 20,
  },
  webMapText: {
    fontSize: 48,
    marginBottom: 10,
  },
  webMapSubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  webMapInfo: {
    fontSize: 14,
    color: '#999',
    marginTop: 10,
  },
  infoPanel: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 10,
    zIndex: 1003,
  },
  infoText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
  },
  infoValue: {
    fontSize: 25,
    fontWeight: 'bold',
  },
  button: {
    position: 'absolute',
    bottom: 50,
    left: '30%',
    width: '40%',
    padding: 15,
    borderRadius: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#ff5722',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
  },
  handInputButton: {
    position: 'absolute',
    bottom: 120,
    left: '30%',
    width: '40%',
    padding: 15,
    borderRadius: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  manualButton: {
    backgroundColor: '#ff9800',
  },
  handInputButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    marginBottom: 5,
  },
  paceText: {
    color: 'green',
    fontWeight: 'bold',
  },
  segmentScrollView: {
    height: 200,
    marginTop: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 20,
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 5,
    backgroundColor: '#ff5722',
    padding: 12,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: '#9e9e9e',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  inputLabel: {
    width: 100,
    fontSize: 16,
    color: '#555',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    backgroundColor: '#fff',
  },
  distanceText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    padding: 12,
  },
});
