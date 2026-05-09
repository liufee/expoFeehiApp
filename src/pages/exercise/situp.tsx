import React, { useEffect, useState } from 'react';
import { Alert, Button, Text, TextInput, View, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addMinutes, format, isValid, parse } from 'date-fns';
import { exerciseService } from '@/src/service/exercise/exercise';
import { Record, RecordType, Status } from '@/src/service/exercise/model';
import { useToast } from '@/src/provider/toast';

export default function SitupScreen() {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const now = new Date();
  const initEnd = addMinutes(now, 90);
  const [startTime, setStartTime] = useState(format(now, 'yyyy-MM-dd HH:mm:ss'));
  const [endTime, setEndTime] = useState(format(initEnd, 'yyyy-MM-dd HH:mm:ss'));
  const [situpPushUp, setSitupPushUp] = useState({
    sitUp: 520,
    pushUp: 130,
    curlUp: 117,
    legsUpTheWallPose: 3,
  });
  const [existingRecordId, setExistingRecordId] = useState<string>('');
  const [saving, setSaving] = useState(false); // 保存时的 loading 状态

  const initTodaySitUpPushUp = async () => {
    const today = format(now, 'yyyy-MM-dd');
    try {
      const [success, rows, error] = await exerciseService.getRecordsByPage(
        [RecordType.RecordTypeSitUpPushUp],
        1,
        1,
        today + ' 00:00:00',
        today + ' 23:59:59',
        'desc'
      );

      if (!success) {
        console.error('获取力量记录失败:', error);
        showToast({ message: error, backgroundColor: 'red' });
        return;
      }

      if (rows.length === 1) {
        const row = rows[0];
        setExistingRecordId(row.id);
        setStartTime(row.start_at);
        setEndTime(row.end_at);

        const ext = row.ext.split(',');
        setSitupPushUp({
          sitUp: parseInt(ext[1]) || 0,
          pushUp: parseInt(ext[0]) || 0,
          curlUp: parseInt(ext[2]) || 0,
          legsUpTheWallPose: parseInt(ext[3]) || 0,
        });
      }
    } catch (error) {
      console.error('获取力量记录异常:', error);
      showToast({ message: '获取记录失败', backgroundColor: 'red' });
    }
  };

  useEffect(() => {
    initTodaySitUpPushUp();
  }, []);

  const handleSave = async () => {
    if (saving) return; // 如果正在保存，直接返回
    
    let parsedDate = parse(startTime, 'yyyy-MM-dd HH:mm:ss', new Date());
    if (!isValid(parsedDate)) {
      showToast({ message: '开始时间格式错误: ' + startTime, backgroundColor: 'red' });
      return;
    }

    parsedDate = parse(endTime, 'yyyy-MM-dd HH:mm:ss', new Date());
    if (!isValid(parsedDate)) {
      showToast({ message: '结束时间格式错误: ' + endTime, backgroundColor: 'red' });
      return;
    }

    const record = {
      type: RecordType.RecordTypeSitUpPushUp,
      startAt: format(startTime, 'yyyy-MM-dd HH:mm:ss'),
      endAt: format(endTime, 'yyyy-MM-dd HH:mm:ss'),
      status: Status.StatusFinished,
      abdominal: {} as any,
      run: {} as any,
      sitUpPushUp: situpPushUp,
    };

    setSaving(true); // 开始保存
    try {
      if (existingRecordId) {
        const [success, error] = await exerciseService.updateRecord(existingRecordId, record);
        if (!success) {
          console.error('更新力量记录失败:', error);
          showToast({ message: error, backgroundColor: 'red' });
          return;
        }
        showToast({ message: '修改成功' });
      } else {
        const [success, error] = await exerciseService.saveRecord(record);
        if (!success) {
          console.error('保存力量记录失败:', error);
          showToast({ message: error, backgroundColor: 'red' });
          return;
        }
        showToast({ message: '保存成功' });
      }
      await initTodaySitUpPushUp();
    } catch (error) {
      console.error('保存力量记录异常:', error);
      showToast({ message: '保存记录失败', backgroundColor: 'red' });
    } finally {
      setSaving(false); // 保存完成
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }]}>
      <Text style={styles.title}>
        {existingRecordId ? '修改今日记录' : '录入力量记录'}
      </Text>

      {[
        { label: '开始时间', value: startTime, setter: setStartTime },
        { label: '结束时间', value: endTime, setter: setEndTime },
        {
          label: '俯卧撑',
          value: situpPushUp.pushUp,
          setter: (val: string) =>
            setSitupPushUp({ ...situpPushUp, pushUp: val === '' ? 0 : parseInt(val) }),
        },
        {
          label: '仰卧起坐',
          value: situpPushUp.sitUp,
          setter: (val: string) =>
            setSitupPushUp({ ...situpPushUp, sitUp: val === '' ? 0 : parseInt(val) }),
        },
        {
          label: '曲腿卷腹',
          value: situpPushUp.curlUp,
          setter: (val: string) =>
            setSitupPushUp({ ...situpPushUp, curlUp: val === '' ? 0 : parseInt(val) }),
        },
        {
          label: '靠墙倒立',
          value: situpPushUp.legsUpTheWallPose,
          setter: (val: string) =>
            setSitupPushUp({ ...situpPushUp, legsUpTheWallPose: val === '' ? 0 : parseInt(val) }),
        },
      ].map((item, index) => (
        <View key={index} style={styles.inputRow}>
          <Text style={styles.label}>{item.label}：</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={item.value.toString()}
            onChangeText={item.setter}
          />
        </View>
      ))}

      <View style={styles.buttonContainer}>
        {saving ? (
          <View style={styles.savingIndicator}>
            <ActivityIndicator size="small" color="#007bff" />
            <Text style={styles.savingText}>保存中...</Text>
          </View>
        ) : (
          <Button
            title={existingRecordId ? '修改记录' : '保存记录'}
            onPress={handleSave}
            color="#007bff"
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f8f9fa',
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
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
  buttonContainer: {
    marginTop: 20,
  },
  savingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  savingText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#007bff',
  },
});
