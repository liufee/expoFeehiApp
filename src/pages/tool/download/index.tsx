import React, {useState, useEffect, useRef} from 'react';
import {View, TextInput, TouchableOpacity, Text, StyleSheet, Alert} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import {AppMoviesBasePath} from '@/constants';
import { useRoute } from '@react-navigation/native';
import { showToast } from '../../../provider';
import config from '@/src/config';

const Download = () => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadedSize, setDownloadedSize] = useState(0);
  const [showProgressBySize, setShowProgressBySize] = useState(false);
  const route = useRoute();
  const inputRef = useRef<TextInput | null>(null);

  useEffect(() => {
    if (route.params?.weblink) {
      setUrl(route.params.weblink);
    }
  }, [route.params?.weblink]);

  const downloadFile = async () => {
    if (!url) {
      return;
    }

    try {
      setLoading(true);
      setProgress(-1);
      setDownloadedSize(0);
      setShowProgressBySize(false);

      const response = await fetch(config.apiBaseURL + '/tool/video-parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-feehi-sec-verify': config.feehiSecVerify,
        },
        body: JSON.stringify({
          url: url,
        }),
      });
      const data = await response.json();
      if(data?.code && data.code !== 0 ){
        throw new Error(`解析失败: ${data.message}`);
      }

      let downloadURL = data.url;
      let fileName = data.filename;

      const targetDir = AppMoviesBasePath;
      const dirInfo = await FileSystem.getInfoAsync(targetDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(targetDir, { intermediates: true });
      }

      const filePath = `${targetDir}/${fileName}`;
      setProgress(0);

      // 使用 expo-file-system 下载文件（Expo Go 兼容）
      const downloadResumable = FileSystem.createDownloadResumable(
        downloadURL,
        filePath,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          if (isNaN(progress)) {
            setShowProgressBySize(true);
            setDownloadedSize(downloadProgress.totalBytesWritten);
          } else {
            setShowProgressBySize(false);
            setProgress(progress);
          }
        }
      );

      const result = await downloadResumable.downloadAsync();

      if (result && result.uri) {
        setLoading(false);
        setProgress(1);
        showToast(`下载成功！`);
        // 自动尝试分享文件（Expo Go 兼容）
        setTimeout(async () => {
          try {
            await Sharing.shareAsync(result.uri);
          } catch (error) {
            console.log('分享失败:', error);
          }
        }, 500);
      } else {
        throw new Error(`下载失败，状态码: ${result.statusCode}`);
      }
    } catch (error) {
      setLoading(false);
      showToast(`下载失败: ${error.message}`);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) {
      return bytes + ' B';
    } else if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(2) + ' KB';
    } else if (bytes < 1024 * 1024 * 1024) {
      return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    } else {
      return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          ref={inputRef}
          style={[styles.input, loading && styles.disabledInput]}
          placeholder="请输入文件URL"
          value={url}
          onChangeText={(val:string)=>{
            setUrl(extractFirstUrl(val));
          }}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
          onFocus={() => {
            setTimeout(() => {
              inputRef.current?.setSelection(0, url.length);
            }, 100);
          }}
        />
        <TouchableOpacity
          style={[styles.button, loading && styles.disabledButton]}
          onPress={downloadFile}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? (progress === -1 ? '解析中' : '下载中') : '下载'}
          </Text>
        </TouchableOpacity>
      </View>
      {loading && (
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            {showProgressBySize
              ? (progress === -1 ? '解析中' : `已下载: ${formatFileSize(downloadedSize)} `)
              : (progress === -1 ? '解析中' : `下载进度: ${(progress * 100).toFixed(1)}% `)}
          </Text>
          {/* Expo Go 兼容的进度条 */}
          <View style={styles.progressBar}>
            <View style={{
              width: `${Math.max(0, Math.min(100, progress * 100))}%`,
              height: '100%',
              backgroundColor: '#007AFF',
              borderRadius: 5,
            }} />
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  input: {
    flex: 1,
    padding: 15,
    fontSize: 16,
    color: '#333',
  },
  button: {
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledInput: {
    backgroundColor: '#f0f0f0',
    color: '#999',
  },
  progressContainer: {
    width: '100%',
    marginTop: 20,
    alignItems: 'center',
  },
  progressText: {
    fontSize: 16,
    marginBottom: 10,
    color: '#333',
  },
  progressBar: {
    width: '100%',
    height: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
    overflow: 'hidden',
  },
});

const tlds = [
  'com','cn','org','net','edu','gov','io','co','top','xyz',
  'tech','vip','cc','biz','info','me','tv','club','shop'
].join('|');
const extractFirstUrl = (text: string) => {
  if (!text) return '';
  const regex = new RegExp(
      `(?:https?:\\/\\/)?` +
      `[a-z0-9-]+(?:\\.[a-z0-9-]+)*\\.` +
      `(?:${tlds})` +
      `(?:\\/[^\\s"'<>]*)?`,
      "i"
  );

  const match = text.match(regex);
  if (!match) return null;

  return match[0].replace(/^[\s"'(<\[{]+|[\s"'\)>.,;:!?，。）\]}]+$/g, '');
};

export default Download;
