import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, ScrollView, Button, NativeModules, Alert} from 'react-native';
import { File, Directory, Paths } from 'expo-file-system';
import {useToast} from '../provider/toast';
import {DownloadPath} from '../../constants';
import {calculateHash as calHash, parseTSR} from '../util/tsr';
interface Props{
    formula: string;
    createdAt: string
    getFullOriginalString: () => Promise<[boolean, string, string]>;
    getTSR: () => Promise<[boolean, string, string]>;
}
const TSRVerify = ({formula, createdAt, getFullOriginalString, getTSR}: Props) => {

    const [loading, setLoading] = useState<boolean>(true);
    const [originalString, setOriginalString] = useState<string>('');
    const [fullOriginalString, setFullOriginalString] = useState<string>('');
    const [calculatedHash, setCalculatedHash] = useState<string>('');
    const [tsr, setTSR] = useState<{Time:string, HashedMessage:string, Certificates:[{Name:string, Content:string}]}>(null);

    const {showToast} = useToast();


    const init = async ()=>{
        const [success, fullOriginal, err] = await getFullOriginalString();
        if(!success){
            Alert.alert('失败', err);
        }
        const original = fullOriginal.length > 70 ? fullOriginal.slice(0, 70) + '...' : fullOriginal;

        setFullOriginalString(fullOriginal);
        setOriginalString(original);
        setCalculatedHash( await calHash(fullOriginal, 'sha256') );
        const [successGetTSR, result, errGetTSR] = await getTSR();
        if(!successGetTSR){
            Alert.alert('getTSR 失败', errGetTSR);
            return;
        }
        const [successParseTSR, tsr] = await parseTSR(result);
        if(!successParseTSR){
            Alert.alert('parseTSR 失败', tsr);
            return;
        }
        setTSR( tsr );
        setLoading(false);
    };
    useEffect(()=>{
        setTimeout(async ()=>{
            await init();
        }, 100);
    }, []);
    if(loading){
        return <></>;
    }
    return (
        <ScrollView style={styles.container}>
            {/* 验证结果 */}
            <View style={styles.section}>
                <Text style={styles.title}>验证结果</Text>
                <View style={styles.card}>
                    <Text style={styles.text}>{calculatedHash === tsr.HashedMessage ? '✅通过' : '❌不通过'}</Text>
                </View>
            </View>
            {/* TSR */}
            <View style={styles.section}>
                <Text style={styles.title}>TSR</Text>
                <View style={styles.card}>
                    <Text style={styles.subTitle}>摘要</Text>
                    <Text style={styles.text}>{tsr.HashedMessage}</Text>
                    <Text style={styles.subTitle}>时间</Text>
                    <Text style={styles.text}>{tsr.Time}</Text>
                    <Text style={styles.subTitle}>证书链:</Text>
                    {tsr.Certificates.map((cert, index) => (
                        <Text key={index} style={styles.text}>
                            {cert.Name}
                        </Text>
                    ))}
                    <Button title="保存证书链" onPress={async() => {
                        try {
                            // 确保目录存在
                            const downloadDir = new Directory(DownloadPath);
                            if (!downloadDir.exists) {
                                downloadDir.create({ intermediates: true });
                            }

                            // 保存所有证书
                            for (const cert of tsr.Certificates) {
                                const certFile = new File(DownloadPath, `${cert.Name}.pem`);
                                certFile.write(cert.Content);
                                showToast({message: `证书链已经保存到${certFile.uri}`});
                            }
                        } catch (error) {
                            console.error('保存证书链失败:', error);
                            Alert.alert('错误', '保存证书链失败');
                        }
                    }} color="#007BFF" />
                </View>
            </View>
            {/* 计算过程 */}
            <View style={styles.section}>
                <Text style={styles.title}>计算摘要</Text>
                <View style={styles.card}>
                    <Text style={styles.subTitle}>拼接公式:</Text>
                    <Text style={styles.text}>{formula}</Text>

                    <Text style={styles.subTitle}>原串:</Text>
                    <Text style={styles.text}><Text onPress={async()=>{
                        try {
                            // 确保目录存在
                            const downloadDir = new Directory(DownloadPath);
                            if (!downloadDir.exists) {
                                downloadDir.create({ intermediates: true });
                            }

                            showToast({message: '保存中...'});
                            const originFile = new File(DownloadPath, 'origin_str.txt');
                            await originFile.write(fullOriginalString);
                            showToast({message: `已经保存到${originFile.uri}`});
                        } catch (error) {
                            console.error('保存原串失败:', error);
                            Alert.alert('错误', '保存原串失败');
                        }
                    }} style={{color:'blue'}}>保存</Text> {originalString}</Text>


                    <Text style={styles.subTitle}>摘要:</Text>
                    <Text style={styles.text}>{calculatedHash}</Text>
                    <Text style={styles.subTitle}>时间:</Text>
                    <Text style={styles.text}>{createdAt}</Text>
                </View>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f4f4f4',
    },
    section: {
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
    },
    subTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#555',
        marginBottom: 10,
    },
    text: {
        fontSize: 16,
        color: '#333',
        backgroundColor: '#fff',
        padding: 10,
        borderRadius: 5,
        marginBottom: 10,
    },
    formula: {
        fontSize: 16,
        color: '#007BFF',
        backgroundColor: '#fff',
        padding: 10,
        borderRadius: 5,
        marginBottom: 10,
    },
    card: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 5,
    },
});

export default TSRVerify;
