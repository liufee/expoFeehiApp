import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, parse } from 'date-fns';
import Calendar from './calendar';
import { exerciseService } from '@/src/service/exercise/exercise';
import { DailyExercise, Record as RecordModel, RecordType } from '@/src/service/exercise/model';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useNavigation } from '@react-navigation/native';
import { useSetting } from '@/src/provider/setting';
import { getShowRecordStartAndEndTime } from './utils';

export default function RecordScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { setting } = useSetting();
  const [menuVisible, setMenuVisible] = useState(false);
  const [records, setRecords] = useState<DailyExercise[]>([]);
  const [showType, setShowType] = useState('list');

  const { showRecordStart, showRecordEnd } = getShowRecordStartAndEndTime(setting.exercise.showRecordsListPeriod);

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
            const [success, error] = await exerciseService.deleteRecord(record);
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

  const displayModes = [
    { label: '列表模式', value: 'list' },
    { label: '日历模式', value: 'calendar' }
  ];

  const handleDisplayModeSelect = (mode: string) => {
    setMenuVisible(false);
    setShowType(mode);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }]}>
      {/* 悬浮球显示模式选择 */}
      <View style={{position: 'absolute', top: insets.top + 33, left: 0, zIndex: 100, padding: 0}}>
        <TouchableOpacity
          style={styles.floatingBall}
          onPress={() => setMenuVisible(true)}
        >
          <Text style={styles.floatingBallText}>S</Text>
        </TouchableOpacity>
      </View>

      <Modal
        transparent
        animationType="fade"
        visible={menuVisible}
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setMenuVisible(false)}>
          <View style={styles.menuModal}>
            {displayModes.map(mode => (
              <TouchableOpacity key={mode.value} style={styles.menuItem} onPress={() => handleDisplayModeSelect(mode.value)}>
                <Text style={styles.menuItemText}>{mode.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

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
                        <Text>
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
                          {exercise.tsr === 1 && <Text onPress={()=>{
                            navigation.navigate('TSRVerify', {type:'exercise', exercise:exercise});
                          }}> {exercise.tsrVerified === 1 ? '✅' : '❌'}</Text>}
                        </Text>
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
  floatingBall: {
    backgroundColor: '#3F51B5',
    width: 40,
    height: 40,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  floatingBallText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'flex-start',
    paddingTop: 50,
    paddingLeft: 16,
  },
  menuModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 100,
    borderWidth: 1,
    borderColor: '#e0e6ed',
  },
  menuItem: { paddingVertical: 8, paddingHorizontal: 12 },
  menuItemText: { fontSize: 14, color: '#3949AB', fontWeight: '600' },
});
