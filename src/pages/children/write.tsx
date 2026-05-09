import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BabyEventItem from './components/BabyEventItem';
import {format} from 'date-fns';
import { childrenService } from '@/src/service/children/children';
import {
    BaseEvent,
    CryEvent,
    EatEvent,
    EventType,
    newBornEvents,
    childrenList,
    PeeEvent,
    PoopEvent,
    SleepEvent,
    Event,
} from '@/src/service/children/model';
import { useToast } from '@/src/provider/toast';

const poopTypes = ['软','稀','硬'];
const poopColors = ['黄','棕','绿'];
const peeAmounts = ['少','中','多'];
const cryLevels = ['轻','中','重'];

// 通用左label右输入框布局
function LabeledDateTime({ label, value, onChange, mode = 'datetime' }:
    {label:string, value:Date, onChange:(value: Date) => void, mode:'date' | 'time' | 'datetime'}){
    const [inputValue, setInputValue] = useState(format(value, 'yyyy-MM-dd HH:mm:ss'));
    const [error, setError] = useState('');

    // 验证时间格式并更新日期
    const handleInputChange = (text: string) => {
        setInputValue(text);
        
        // 尝试解析输入的时间字符串
        const dateRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
        if (!dateRegex.test(text)) {
            setError('请输入正确的时间格式：YYYY-MM-DD HH:mm:ss');
            return;
        }
        
        const parsedDate = new Date(text);
        if (isNaN(parsedDate.getTime())) {
            setError('无效的时间格式');
            return;
        }
        
        // 验证日期各部分是否合理
        const year = parsedDate.getFullYear();
        const month = parsedDate.getMonth() + 1;
        const day = parsedDate.getDate();
        const hours = parsedDate.getHours();
        const minutes = parsedDate.getMinutes();
        const seconds = parsedDate.getSeconds();
        
        // 检查原始输入与解析后的日期是否一致（防止自动修正）
        const inputParts = text.split(/[- :]/);
        const inputYear = parseInt(inputParts[0]);
        const inputMonth = parseInt(inputParts[1]);
        const inputDay = parseInt(inputParts[2]);
        const inputHours = parseInt(inputParts[3]);
        const inputMinutes = parseInt(inputParts[4]);
        const inputSeconds = parseInt(inputParts[5]);
        
        if (year !== inputYear || month !== inputMonth || day !== inputDay ||
            hours !== inputHours || minutes !== inputMinutes || seconds !== inputSeconds) {
            setError('日期或时间值超出有效范围');
            return;
        }
        
        setError('');
        onChange(parsedDate);
    };

    return (
        <>
            <View style={styles.row}>
                <Text style={styles.label}>{label}</Text>
                <TextInput 
                    style={[styles.input, error ? styles.inputError : null]} 
                    value={inputValue}
                    onChangeText={handleInputChange}
                    placeholder="YYYY-MM-DD HH:mm:ss"
                />
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </>
    );
}

function LabeledOption({ label, options, selected, onSelect }:
    {label: string, options: any, selected: string, onSelect: (value: string) => void}) {
    const entries = Array.isArray(options)
        ? options.map((value: any, _: any) => [value, value])
        : Object.entries(options);
    return (
        <View style={styles.row}>
            <Text style={styles.label}>{label}</Text>
            <View style={styles.optionRow}>
                {entries.map(([key, value]) => (
                    <TouchableOpacity
                        key={key as string}
                        style={[styles.optionBtn, selected === key && styles.optionBtnSelected]}
                        onPress={() => onSelect(key as string)}
                    >
                        <Text style={selected === key ? styles.optionTextSelected : styles.optionText}> {value as string} </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

function LabeledInput({ label, value, onChange, placeholder, keyboardType='default' }:
    {label: string, value: string, onChange: (text: string) => void, placeholder?: string, keyboardType?: any}){
    return (
        <View style={styles.row}>
            <Text style={styles.label}>{label}</Text>
            <TextInput style={styles.input} value={value} onChangeText={onChange} placeholder={placeholder} keyboardType={keyboardType}/>
        </View>
    );
}

export default function Write(){
    const insets = useSafeAreaInsets();
    const { showToast } = useToast();
    const [child,setChild] = useState('son');
    const [eventType,setEventType] = useState(EventType.Eat);
    const [events,setEvents] = useState<any[]>([]);

    const [startTime,setStartTime] = useState(new Date());
    const [endTime,setEndTime] = useState(new Date());

    const [eatAmount,setEatAmount] = useState('');

    const [poopType,setPoopType] = useState(poopTypes[0]);
    const [poopColor,setPoopColor] = useState(poopColors[0]);

    const [peeAmount,setPeeAmount] = useState(peeAmounts[0]);

    const [cryLevel,setCryLevel] = useState(cryLevels[0]);

    useEffect(()=>{
        loadEvents();
    },[]);

    const loadEvents = async () => {
        const start = new Date();
        start.setDate(start.getDate() - 7);
        start.setHours(0,0,0,0);
        const end = new Date();
        const [success, items, err] = await childrenService.getEvents(
            Object.keys(childrenList),
            [EventType.Eat, EventType.Poop, EventType.Pee, EventType.Sleep, EventType.Cry],
            start.toISOString(),
            end.toISOString(),
            'created_at',
            'DESC',
            5
        );
        if(!success) {
            showToast({ message: '获取 events 错误:' + err, backgroundColor: 'red' });
            return;
        }
        setEvents(items);
    };

    const createEvent = async ()=>{
        if ( !(eventType in newBornEvents) ){
            showToast({ message: '未知 event type ' + eventType, backgroundColor: 'red' });
            return;
        }
        let event:BaseEvent = {
            id: '',
            child: child,
            eventType: eventType,
            startTime: startTime.toISOString(),
            endTime: startTime.toISOString(),
            duration: 0,// service 会计算
        };

        switch (eventType) {
            case EventType.Eat:
                const amount = Number(eatAmount);
                if(amount <= 0){
                    showToast({ message: 'amount 错误', backgroundColor: 'red' });
                    return;
                }
                event = {
                    ...event,
                    amount: amount,
                } as EatEvent;
                break;

            case EventType.Poop:
                event = {
                    ...event,
                    type: poopType,
                    color: poopColor,
                } as PoopEvent;
                break;

            case EventType.Pee:
                event = {
                    ...event,
                    level: peeAmount,
                } as PeeEvent;
                break;

            case EventType.Sleep:
                event = {
                    ...event,
                    endTime: endTime.toISOString(),
                } as SleepEvent;
                break;

            case EventType.Cry:
                event = {
                    ...event,
                    endTime: endTime.toISOString(),
                    level: cryLevel,
                } as CryEvent;
                break;
        }
        const [success, err] = await childrenService.createEvent(event as Event);
        if(!success){
            showToast({ message: '保存失败:' + err, backgroundColor: 'red' });
            return;
        }
        setStartTime(new Date());
        setEndTime(new Date());

        setEatAmount('');

        setPoopType(poopTypes[0]);
        setPoopColor(poopColors[0]);

        setPeeAmount(peeAmounts[0]);

        setCryLevel(cryLevels[0]);

        showToast({ message: '保存成功' });
        await loadEvents();
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }]}>
            <View style={styles.formContainer}>
                <LabeledOption label="👶 孩子" options={childrenList} selected={child} onSelect={setChild}/>
                <LabeledOption label="📝 类型" options={newBornEvents} selected={eventType} onSelect={(value) => setEventType(value as EventType)}/>
                {eventType === EventType.Eat && <>
                    <LabeledDateTime label="🍼 喂养时间" value={startTime} onChange={setStartTime}/>
                    <LabeledInput label="🥛 奶量" value={eatAmount} onChange={setEatAmount} placeholder="ml" keyboardType="numeric"/>
                </>}
                {eventType === EventType.Poop && <>
                    <LabeledDateTime label="💩 排便时间" value={startTime} onChange={setStartTime}/>
                    <LabeledOption label="🟤 类型" options={poopTypes} selected={poopType} onSelect={setPoopType}/>
                    <LabeledOption label="🎨 颜色" options={poopColors} selected={poopColor} onSelect={setPoopColor}/>
                </>}
                {eventType === EventType.Pee && <>
                    <LabeledDateTime label="💧 排尿时间" value={startTime} onChange={setStartTime}/>
                    <LabeledOption label="💦 量" options={peeAmounts} selected={peeAmount} onSelect={setPeeAmount}/>
                </>}
                {eventType === EventType.Sleep && <>
                    <LabeledDateTime label="😴 入睡" value={startTime} onChange={setStartTime}/>
                    <LabeledDateTime label="😊 醒来" value={endTime} onChange={setEndTime}/>
                </>}
                {eventType === EventType.Cry && <>
                    <LabeledDateTime label="😢 开始" value={startTime} onChange={setStartTime}/>
                    <LabeledDateTime label="😌 结束" value={endTime} onChange={setEndTime}/>
                    <LabeledOption label="⚡ 级别" options={cryLevels} selected={cryLevel} onSelect={setCryLevel}/>
                </>}
                <TouchableOpacity style={styles.saveBtn} onPress={createEvent}>
                    <Text style={styles.saveBtnText}>📝 保存记录</Text>
                </TouchableOpacity>
            </View>
            <Text style={styles.countLabel}>📋 最近记录 ({events.length})</Text>
            <FlatList
                data={events}
                keyExtractor={(item)=> item.id}
                renderItem={({item, index})=>(
                    <BabyEventItem event={item} isLast={index === events.length - 1} onDeleted={loadEvents} />
                )}
                contentContainerStyle={styles.logList}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {  flex: 1, backgroundColor: '#F8F9FA' },
    formContainer: {padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0'},
    row: { flexDirection:'row', alignItems:'center', marginVertical:6 },
    label: { width:90, fontSize:14, color:'#555' },
    input: { flex:1, paddingVertical:12,paddingHorizontal:14,borderWidth:1,borderColor:'#007AFF',borderRadius:8, backgroundColor:'#f0f7ff' },
    inputError: { borderColor:'#FF3B30', backgroundColor:'#FFF0F0' },
    errorText: { color:'#FF3B30', fontSize:12, marginLeft:90, marginTop:-4, marginBottom:4 },
    inputText: { fontSize:14,color:'#007AFF',fontWeight:'500' },
    optionRow: { flexDirection:'row', flexWrap:'wrap' },
    optionBtn: { paddingVertical:6,paddingHorizontal:12,borderWidth:1,borderColor:'#ddd',borderRadius:20,marginRight:6,marginBottom:6, backgroundColor:'#fff', textAlign:'center' },
    optionBtnSelected: { backgroundColor:'#007AFF', borderColor:'#007AFF' },
    optionText: { color:'#333' },
    optionTextSelected: { color:'#fff', fontWeight:'500' },
    saveBtn: { backgroundColor:'#007AFF',borderRadius:12,paddingVertical:14,marginTop:16,alignItems:'center' },
    saveBtnText: { color:'#fff',fontSize:16,fontWeight:'600', width: 90},
    countLabel:{fontSize:13, fontWeight:'500', color:'#666', padding:16, paddingBottom:4, backgroundColor:'#F8F9FA',},
    logList:{padding:16, paddingTop:8},
});
