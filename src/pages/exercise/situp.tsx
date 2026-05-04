import React, { useEffect, useState } from 'react';
import { Alert, Button, Text, TextInput, View, StyleSheet } from 'react-native';
import { addMinutes, format, isValid, parse } from 'date-fns';
import { exerciseService } from '@/src/service/exercise';
import { Record, RecordType, Status } from '@/src/db/model';

export default function SitupScreen() {
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
        Alert.alert('失败', error);
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
      Alert.alert('失败', '获取记录失败');
    }
  };

  useEffect(() => {
    initTodaySitUpPushUp();
  }, []);

  const handleSave = async () => {
    let parsedDate = parse(startTime, 'yyyy-MM-dd HH:mm:ss', new Date());
    if (!isValid(parsedDate)) {
      Alert.alert('错误', '开始时间格式错误: ' + startTime);
      return;
    }

    parsedDate = parse(endTime, 'yyyy-MM-dd HH:mm:ss', new Date());
    if (!isValid(parsedDate)) {
      Alert.alert('错误', '结束时间格式错误: ' + endTime);
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
      tsr: 0,
      tsrVerified: 0,
    };

    try {
      if (existingRecordId) {
        const [success, error] = await exerciseService.updateRecord(existingRecordId, record);
        if (!success) {
          Alert.alert('失败', error);
          return;
        }
        Alert.alert('成功', '修改成功');
      } else {
        const [success, error] = await exerciseService.saveRecord(record);
        if (!success) {
          Alert.alert('失败', error);
          return;
        }
        Alert.alert('成功', '保存成功');
      }
      await initTodaySitUpPushUp();
    } catch (error) {
      Alert.alert('失败', '保存记录失败');
    }
  };

  return (
    <View style={styles.container}>
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

      <Button
        title={existingRecordId ? '修改记录' : '保存记录'}
        onPress={handleSave}
        color="#007bff"
      />
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
});
