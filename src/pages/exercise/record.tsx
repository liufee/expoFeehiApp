import React, { useEffect, useState } from 'react';
import {
  Alert,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, parse } from 'date-fns';
import Calendar from './calendar';
import { exerciseService } from '@/src/service/exercise/exercise';
import { DailyExercise, Record as RecordModel, RecordType } from '@/src/service/exercise/model';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function RecordScreen() {
  const insets = useSafeAreaInsets();
  const [isMenuVisible, setMenuVisible] = useState(false);
  const [menuAnimation] = useState(new Animated.Value(-250));
  const [opacityAnimation] = useState(new Animated.Value(0));
  const [records, setRecords] = useState<DailyExercise[]>([]);
  const [showType, setShowType] = useState('list');

  const getShowRecordStartAndEndTime = (period: number) => {
    const now = new Date();
    const startDate = new Date(now.getTime() - period * 24 * 60 * 60 * 1000);
    return {
      showRecordStart: format(startDate, 'yyyy-MM-dd HH:mm:ss'),
      showRecordEnd: format(now, 'yyyy-MM-dd HH:mm:ss'),
    };
  };

  const { showRecordStart, showRecordEnd } = getShowRecordStartAndEndTime(30);

  const refreshRecord = async () => {
    try {
      const [success, dailyExercises, error] = await exerciseService.getDailyExercises(
        [RecordType.RecordTypeAbdominal, RecordType.RecordTypeRun, RecordType.RecordTypeSitUpPushUp],
        showRecordStart,
        showRecordEnd,
        'desc'
      );
      if (!success) {
        Alert.alert('失败', error);
        return;
      }
      setRecords(dailyExercises);
    } catch (error) {
      Alert.alert('失败', '获取记录失败');
    }
  };

  useEffect(() => {
    refreshRecord();
  }, []);

  const handleDelete = (record: RecordModel) => {
    Alert.alert('确认删除', '确定要删除这个记录吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            const [success, error] = await exerciseService.deleteRecord(record.id);
            if (!success) {
              Alert.alert('失败', error);
              return;
            }
            Alert.alert('成功', '删除成功');
            await refreshRecord();
          } catch (error) {
            Alert.alert('失败', '删除失败');
          }
        },
      },
    ]);
  };

  const getBadgeStatus = (exercises: RecordModel[]) => {
    const valueSet = new Set(exercises.map(item => item.type));
    return [
      RecordType.RecordTypeAbdominal,
      RecordType.RecordTypeRun,
      RecordType.RecordTypeSitUpPushUp,
    ].every(val => valueSet.has(val))
      ? 'success'
      : 'normal';
  };

  const toggleMenu = () => {
    const toValue = isMenuVisible ? -250 : 0;
    const opacityValue = isMenuVisible ? 0 : 0.5;

    setMenuVisible(!isMenuVisible);
    Animated.spring(menuAnimation, {
      toValue,
      useNativeDriver: true,
    }).start();

    Animated.timing(opacityAnimation, {
      toValue: opacityValue,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeMenu = () => {
    toggleMenu();
  };

  const changeDisplayType = (type: string) => {
    setShowType(type);
    toggleMenu();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }]}>
      {!isMenuVisible && (
        <TouchableOpacity style={styles.menuButton} onPress={toggleMenu}>
          <Text style={styles.menuButtonText}>☰</Text>
        </TouchableOpacity>
      )}

      {isMenuVisible && (
        <TouchableWithoutFeedback onPress={closeMenu}>
          <Animated.View style={[styles.overlay, { opacity: opacityAnimation }]} />
        </TouchableWithoutFeedback>
      )}

      <Animated.View
        style={[styles.sideMenu, { transform: [{ translateX: menuAnimation } as const] }]}>
        <TouchableOpacity onPress={() => changeDisplayType('list')}>
          <View style={styles.menuItem}>
            <Text style={styles.menuItemText}>列表模式</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => changeDisplayType('calendar')}>
          <View style={styles.menuItem}>
            <Text style={styles.menuItemText}>日历模式</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>

      {showType === 'list' && (
        <ScrollView style={styles.contentArea}>
          {records.map((record: DailyExercise, index) => {
            const badgeStatus = getBadgeStatus(record.exercises);

            return (
              <View key={index} style={styles.recordCard}>
                <View style={styles.recordHeader}>
                  <Text style={{ ...styles.dateText, width: 250 }}>{record.date}</Text>
                  <View
                    style={[
                      styles.badge,
                      badgeStatus === 'success' ? styles.successBadge : styles.normalBadge,
                    ]}>
                    <Text style={styles.badgeText}>
                      {badgeStatus === 'success' ? '✓' : record.exercises.length}
                    </Text>
                  </View>
                </View>

                {record.exercises.map((exercise, idx) => {
                  const startAt = parse(exercise.startAt, 'yyyy-MM-dd HH:mm:ss', new Date());
                  const endAt = parse(exercise.endAt, 'yyyy-MM-dd HH:mm:ss', new Date());

                  if (
                    exercise.type === RecordType.RecordTypeRun &&
                    exercise.run.runningWithoutPosition === 1
                  ) {
                    exercise.run.distance = 8.15;
                    const [hours, minutes, seconds] = exercise.run.runDuration
                      .split(':')
                      .map(Number);
                    const totalHours = hours + minutes / 60 + seconds / 3600;
                    exercise.run.avgPace = exercise.run.distance / totalHours;
                  }

                  return (
                    <TouchableOpacity
                      key={idx}
                      style={styles.exerciseCard}
                      onLongPress={() => handleDelete(exercise)}>
                      <View style={styles.iconContainer}>
                        {exercise.type === RecordType.RecordTypeAbdominal && (
                          <IconSymbol name="figure.core.training" size={28} color="#4CAF50" />
                        )}
                        {exercise.type === RecordType.RecordTypeRun && (
                          <IconSymbol name="figure.run" size={28} color="#2196F3" />
                        )}
                        {exercise.type === RecordType.RecordTypeSitUpPushUp && (
                          <IconSymbol name="figure.strengthtraining.traditional" size={28} color="#FF9800" />
                        )}
                      </View>
                      <View style={styles.detailsContainer}>
                        {exercise.type === RecordType.RecordTypeAbdominal && (
                          <Text style={styles.exerciseText}>
                            {`${format(startAt, 'HH:mm:ss')}~${format(
                              endAt,
                              'HH:mm:ss'
                            )} / ${((endAt.getTime() - startAt.getTime()) / 1000 / 60).toFixed(
                              2
                            )}min`}
                          </Text>
                        )}
                        {exercise.type === RecordType.RecordTypeRun && (
                          <Text style={styles.exerciseText}>
                            {`${format(startAt, 'HH:mm:ss')}~${format(
                              endAt,
                              'HH:mm:ss'
                            )} | 配速: ${exercise.run.avgPace.toFixed(
                              2
                            )}km/h | 耗时: ${exercise.run.runDuration} | 距离: ${exercise.run.distance.toFixed(
                              2
                            )}km ${
                              exercise.run.runningWithoutPosition === 1 ? '| 仅计时' : '| 定位'
                            }`}
                          </Text>
                        )}
                        {exercise.type === RecordType.RecordTypeSitUpPushUp && (
                          <Text style={styles.exerciseText}>
                            {`${format(startAt, 'HH:mm:ss')}~${format(
                              endAt,
                              'HH:mm:ss'
                            )} / ${((endAt.getTime() - startAt.getTime()) / 1000 / 60).toFixed(
                              2
                            )}min | 俯卧撑: ${exercise.sitUpPushUp.pushUp} | 仰卧起坐: ${
                              exercise.sitUpPushUp.sitUp
                            } | 曲腿卷腹: ${exercise.sitUpPushUp.curlUp} | 靠墙倒立: ${
                              exercise.sitUpPushUp.legsUpTheWallPose
                            }`}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })}
        </ScrollView>
      )}

      {showType === 'calendar' && <Calendar records={records} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F8F8F8',
    position: 'relative',
  },
  menuButton: {
    position: 'absolute',
    top: 3,
    left: 3,
    zIndex: 999,
    backgroundColor: 'gray',
    padding: 8,
    borderRadius: 50,
  },
  menuButtonText: {
    fontSize: 15,
    color: '#fff',
  },
  sideMenu: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 200,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingTop: 60,
    borderRightWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: -3, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
    zIndex: 9999,
    marginTop: 50,
    marginLeft: 10,
    borderTopLeftRadius: 15,
    borderBottomLeftRadius: 15,
  },
  menuItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderColor: '#E0E0E0',
  },
  menuItemText: {
    fontSize: 18,
    color: '#fff',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 9998,
  },
  contentArea: {
    marginLeft: 0,
    flex: 1,
  },
  recordCard: {
    marginBottom: 12,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  normalBadge: {
    backgroundColor: '#FFB74D',
  },
  successBadge: {
    backgroundColor: '#4CAF50',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: '#F9F9F9',
    borderRadius: 10,
    padding: 8,
    shadowColor: '#ddd',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  detailsContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  exerciseText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 18,
  },
});
