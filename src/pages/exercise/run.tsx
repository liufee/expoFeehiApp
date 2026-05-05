import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, parse, isValid } from 'date-fns';
import { exerciseService } from '@/src/service/exercise/exercise';
import { RecordType, Status } from '@/src/service/exercise/model';
import { formatTime } from './utils';

const PROGRESS_KEY_LAST_HAND_INPUT_START_TIME = 'last_hand_input_run_start_time';

export default function RunScreen() {
  const [showHandInput, setShowHandInput] = useState(false);
  const [handInputStartAt, setHandInputStartAt] = useState('');
  const [handInputEndAt, setHandInputEndAt] = useState('');
  const [saving, setSaving] = useState(false); // 保存时的 loading 状态
  const handInputDistance = 8.15; // 默认距离

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
      type: RecordType.RecordTypeRun,
      startAt: handInputStartAt,
      endAt: handInputEndAt,
      status: Status.StatusFinished,
      abdominal: {} as any,
      run: {
        avgPace: 0,
        distance: handInputDistance,
        runDuration: duration,
        runningWithoutPosition: 1,
        paths: [],
      },
      sitUpPushUp: {} as any,
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
      <Text style={styles.title}>🏃 跑步训练 </Text>
      <Text>      仅支持手动录入</Text>
      {/* 手动录入按钮 */}
      <TouchableOpacity style={styles.handInputButton} onPress={handleShowHandInput}>
        <Text style={styles.handInputButtonText}>手动录入</Text>
      </TouchableOpacity>

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
                disabled={saving} // 保存时禁用按钮
                style={[styles.modalButton, styles.cancelButton, saving && { opacity: 0.5 }]}
                onPress={() => setShowHandInput(false)}
              >
                <Text style={styles.buttonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                disabled={saving} // 保存时禁用按钮
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  handInputButton: {
    position: 'absolute',
    bottom: 50,
    left: '30%',
    width: '40%',
    backgroundColor: '#ff9800',
    padding: 15,
    borderRadius: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
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
    marginBottom: 20,
    textAlign: 'center',
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
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
