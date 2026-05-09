import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { File, Directory, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import JSZip from 'jszip';
import {router} from "expo-router";
import { useToast } from '@/src/provider/toast';

interface FileItem {
  name: string;
  uri: string;
  isDirectory: boolean;
  size?: number;
  modificationTime?: number;
}
const syncURL = "http://192.168.1.2:8088"
export default function FileManagerScreen() {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  const [currentPath, setCurrentPath] = useState<string>(Paths.document.uri);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renameItem, setRenameItem] = useState<FileItem | null>(null);
  const [newName, setNewName] = useState('');
  const [pathHistory, setPathHistory] = useState<string[]>([]);
  const [extractProgress, setExtractProgress] = useState<{visible: boolean; current: number; total: number; currentFile: string}>({visible: false, current: 0, total: 0, currentFile: ''});
  const [syncProgress, setSyncProgress] = useState<{visible: boolean; current: number; total: number; currentFile: string; status: string}>({visible: false, current: 0, total: 0, currentFile: '', status: ''});
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    loadFiles();
  }, [currentPath]);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const directory = new Directory(currentPath);
      if (!directory.exists) {
        showToast({ message: '当前路径无效', backgroundColor: 'red' });
        setLoading(false);
        return;
      }

      const contents = directory.list();
      const fileItems: FileItem[] = [];

      for (const item of contents) {
        const isDirectory = item instanceof Directory;
        const name = item.name;
        const uri = item.uri;

        fileItems.push({
          name: name,
          uri: uri,
          isDirectory: isDirectory,
          size: isDirectory ? (item as Directory).size || undefined : (item as File).size || undefined,
          modificationTime: isDirectory ? undefined : (item as File).modificationTime || undefined,
        });
      }

      // 排序：文件夹在前，文件在后，按名称排序
      fileItems.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });

      setFiles(fileItems);
    } catch (error) {
      console.error('加载文件失败:', error);
      showToast({ message: '加载文件列表失败', backgroundColor: 'red' });
    } finally {
      setLoading(false);
    }
  };

  const navigateToFolder = (folderUri: string, folderName: string) => {
    setPathHistory([...pathHistory, currentPath]);
    // Ensure the path ends with a slash
    setCurrentPath(folderUri.endsWith('/') ? folderUri : folderUri + '/');
  };

  const goBack = () => {
    if (pathHistory.length > 0) {
      const previousPath = pathHistory[pathHistory.length - 1];
      setPathHistory(pathHistory.slice(0, -1));
      setCurrentPath(previousPath);
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  const formatDate = (timestamp?: number): string => {
    if (!timestamp) return '-';
    // 判断时间戳是秒还是毫秒：如果小于 10000000000 则是秒，否则是毫秒
    const timestampMs = timestamp < 10000000000 ? timestamp * 1000 : timestamp;
    const date = new Date(timestampMs);

    // 验证日期是否合理（在 1970-2100 之间）
    if (date.getFullYear() < 1970 || date.getFullYear() > 2100) {
      console.warn('无效的时间戳:', timestamp, '转换后:', timestampMs, '日期:', date);
      return '-';
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const result = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

    return result;
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) {
      showToast({ message: '请输入文件夹名称', backgroundColor: 'red' });
      return;
    }

    try {
      const newFolder = new Directory(currentPath, newFolderName);

      if (newFolder.exists) {
        showToast({ message: '文件夹已存在', backgroundColor: 'red' });
        return;
      }

      newFolder.create({ intermediates: true });
      setNewFolderName('');
      setModalVisible(false);
      await loadFiles();
      showToast({ message: '文件夹创建成功' });
    } catch (error) {
      console.error('创建文件夹失败:', error);
      showToast({ message: '创建文件夹失败', backgroundColor: 'red' });
    }
  };

  const deleteItem = async (item: FileItem) => {
    Alert.alert(
      '确认删除',
      `确定要删除 ${item.isDirectory ? '文件夹' : '文件'} "${item.name}" 吗？${item.isDirectory ? '这将删除所有内容。' : ''}`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('开始删除:', item.name);
              console.log('URI:', item.uri);
              console.log('类型:', item.isDirectory ? '目录' : '文件');

              if (item.isDirectory) {
                // 移除 URI 末尾的斜杠，确保路径格式正确
                const cleanUri = item.uri.endsWith('/') ? item.uri.slice(0, -1) : item.uri;
                const directory = new Directory(cleanUri);
                console.log('清理后的 URI:', cleanUri);
                console.log('目录存在性:', directory.exists);

                if (!directory.exists) {
                  throw new Error('目录不存在');
                }

                directory.delete();
                console.log('目录删除成功');
              } else {
                const file = new File(item.uri);
                console.log('文件存在性:', file.exists);

                if (!file.exists) {
                  throw new Error('文件不存在');
                }

                file.delete();
                console.log('文件删除成功');
              }

              await loadFiles();
              showToast({ message: '删除成功' });
            } catch (error) {
              console.error('删除失败:', error);
              showToast({ message: `删除失败: ${error instanceof Error ? error.message : String(error)}`, backgroundColor: 'red' });
            }
          },
        },
      ]
    );
  };

  const renameItem_start = (item: FileItem) => {
    setRenameItem(item);
    setNewName(item.name);
  };

  const renameItem_execute = async () => {
    if (!renameItem || !newName.trim()) {
      showToast({ message: '请输入新名称', backgroundColor: 'red' });
      return;
    }

    if (newName === renameItem.name) {
      setRenameItem(null);
      setNewName('');
      return;
    }

    try {
      if (renameItem.isDirectory) {
        const directory = new Directory(renameItem.uri);
        directory.rename(newName);
      } else {
        const file = new File(renameItem.uri);
        file.rename(newName);
      }

      setRenameItem(null);
      setNewName('');
      await loadFiles();
      showToast({ message: '重命名成功' });
    } catch (error) {
      console.error('重命名失败:', error);
      showToast({ message: '重命名失败', backgroundColor: 'red' });
    }
  };

  const shareFile = async (item: FileItem) => {
    if (item.isDirectory) {
      showToast({ message: '暂不支持分享文件夹', backgroundColor: 'orange' });
      return;
    }

    try {
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        showToast({ message: '分享功能不可用', backgroundColor: 'red' });
        return;
      }

      await Sharing.shareAsync(item.uri);
    } catch (error) {
      console.error('分享失败:', error);
      showToast({ message: '分享失败', backgroundColor: 'red' });
    }
  };

  const importFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const selectedFile = result.assets[0];
      const isZipFile = selectedFile.name.toLowerCase().endsWith('.zip');

      if (isZipFile) {
        // 处理 ZIP 文件
        await importAndExtractZip(selectedFile.uri, selectedFile.name);
      } else {
        // 处理普通文件
        const destPath = `${currentPath}${selectedFile.name}`;

        const destFile = new File(destPath);
        if (destFile.exists) {
          Alert.alert(
            '文件已存在',
            `文件 "${selectedFile.name}" 已存在，是否覆盖？`,
            [
              { text: '取消', style: 'cancel' },
              {
                text: '覆盖',
                onPress: async () => {
                  await performImport(selectedFile.uri, destPath);
                },
              },
            ]
          );
        } else {
          await performImport(selectedFile.uri, destPath);
        }
      }
    } catch (error) {
      console.error('导入失败:', error);
      showToast({ message: '导入失败', backgroundColor: 'red' });
    }
  };

  const performImport = async (sourceUri: string, destPath: string) => {
    try {
      const sourceFile = new File(sourceUri);
      const destFile = new File(destPath);
      sourceFile.copy(destFile);
      await loadFiles();
      showToast({ message: '导入成功' });
    } catch (error) {
      console.error('复制文件失败:', error);
      showToast({ message: '导入失败', backgroundColor: 'red' });
    }
  };

  // 解压并导入 ZIP 文件
  const importAndExtractZip = async (zipUri: string, zipName: string) => {
    try {
      setLoading(true);
      console.log('开始处理ZIP文件:', zipName);
      console.log('ZIP文件URI:', zipUri);

      // 获取文件大小
      const zipFile = new File(zipUri);
      const fileSize = zipFile.size || 0;
      console.log('ZIP文件大小:', formatFileSize(fileSize));

      // 检查文件大小，如果超过50MB给出警告
      if (fileSize > 50 * 1024 * 1024) {
        Alert.alert(
          '文件过大',
          `ZIP文件大小为 ${formatFileSize(fileSize)}，可能导致内存不足。建议压缩更小的文件或分批处理。`,
          [
            { text: '取消', style: 'cancel', onPress: () => setLoading(false) },
            {
              text: '继续尝试',
              onPress: async () => {
                await processZipFile(zipUri, zipName);
              }
            }
          ]
        );
        return;
      }

      await processZipFile(zipUri, zipName);
    } catch (error) {
      console.error('解压 ZIP 文件失败:', error);
      setExtractProgress({visible: false, current: 0, total: 0, currentFile: ''});
      showToast({ message: `解压失败: ${error instanceof Error ? error.message : String(error)}`, backgroundColor: 'red' });
    } finally {
      setLoading(false);
    }
  };

  // 处理ZIP文件的实际逻辑 - 使用分块读取避免内存溢出
  const processZipFile = async (zipUri: string, zipName: string) => {
    try {
      console.log('开始处理ZIP文件...');

      // 获取文件信息
      const zipFile = new File(zipUri);
      const fileSize = zipFile.size || 0;
      console.log('ZIP文件大小:', formatFileSize(fileSize));

      // 对于超大文件，给出明确提示
      if (fileSize > 8000 * 1024 * 1024) {
        Alert.alert(
          '文件过大',
          `ZIP文件大小为 ${formatFileSize(fileSize)}。\n\n由于移动端内存限制，建议：\n• 在电脑上解压后分批导入\n• 或将文件分割成小于100MB的多个ZIP`,
          [
            { text: '取消', style: 'cancel', onPress: () => setLoading(false) },
            {
              text: '仍然尝试',
              style: 'destructive',
              onPress: async () => {
                await extractLargeZipWithChunks(zipUri, zipName, fileSize);
              }
            }
          ]
        );
        return;
      }

      // 对于中等大小文件，使用优化策略
      await extractLargeZipWithChunks(zipUri, zipName, fileSize);
    } catch (error) {
      console.error('处理ZIP文件失败:', error);
      setExtractProgress({visible: false, current: 0, total: 0, currentFile: ''});
      showToast({ message: `解压失败: ${error instanceof Error ? error.message : String(error)}`, backgroundColor: 'red' });
    } finally {
      setLoading(false);
    }
  };

  // 使用分块方式解压大ZIP文件
  const extractLargeZipWithChunks = async (zipUri: string, zipName: string, fileSize: number) => {
    let tempFolder: Directory | null = null;

    try {
      console.log('使用流式处理方式处理ZIP文件');

      // 创建临时文件夹
      const tempFolderName = `temp_extract_${Date.now()}`;
      const tempFolderPath = `${currentPath}${tempFolderName}/`;
      tempFolder = new Directory(tempFolderPath);
      console.log('创建临时文件夹:', tempFolderPath);
      tempFolder.create({ intermediates: true });

      // 对于超过200MB的文件，给出警告
      if (fileSize > 200 * 1024 * 1024) {
        console.warn('文件非常大，处理可能需要较长时间');
      }

      // 尝试直接读取整个文件（Expo可能会优化内部实现）
      console.log('开始读取ZIP文件...');
      setExtractProgress({
        visible: true,
        current: 0,
        total: 100,
        currentFile: '读取ZIP文件中...'
      });

      let zipData: any;
      try {
        // 尝试一次性读取，但添加超时和错误处理
        const base64Data = await Promise.race([
          FileSystemLegacy.readAsStringAsync(zipUri, {
            encoding: FileSystemLegacy.EncodingType.Base64,
          }),
          new Promise<string>((_, reject) =>
            setTimeout(() => reject(new Error('读取超时')), 300000) // 5分钟超时
          )
        ]);

        console.log('ZIP文件读取完成');
        zipData = base64Data;
      } catch (readError) {
        console.error('一次性读取失败:', readError);

        // 如果失败，尝试使用ArrayBuffer方式分批读取
        console.log('尝试使用ArrayBuffer分批读取...');
        zipData = await readZipAsArrayBuffer(zipUri, fileSize);
      }

      console.log('加载ZIP结构...');
      setExtractProgress({
        visible: true,
        current: 50,
        total: 100,
        currentFile: '解析ZIP结构...'
      });

      // 加载ZIP - JSZip支持base64字符串或ArrayBuffer
      const zip = await JSZip.loadAsync(zipData, {
        base64: typeof zipData === 'string'
      });

      // 立即释放原始数据
      zipData = '';

      const fileEntries = Object.keys(zip.files).filter(key => !zip.files[key].dir);
      const fileCount = fileEntries.length;
      console.log(`ZIP包含 ${fileCount} 个文件`);

      if (fileCount === 0) {
        throw new Error('ZIP文件中没有可解压的文件');
      }

      // 解压所有文件
      setExtractProgress({visible: true, current: 0, total: fileCount, currentFile: '准备解压...'});
      await extractZipContents(zip, tempFolderPath, fileCount);

      // 释放ZIP对象
      (zip as any) = null;

      console.log('移动文件到目标目录...');
      setExtractProgress({
        visible: true,
        current: fileCount,
        total: fileCount,
        currentFile: '整理文件中...'
      });

      await moveExtractedContents(tempFolderPath, currentPath);

      // 删除临时文件夹
      if (tempFolder && tempFolder.exists) {
        console.log('删除临时文件夹');
        tempFolder.delete();
      }

      setExtractProgress({visible: false, current: 0, total: 0, currentFile: ''});
      await loadFiles();
      showToast({ message: `ZIP 文件解压并导入成功，共 ${fileCount} 个文件` });
    } catch (error) {
      console.error('解压失败:', error);
      setExtractProgress({visible: false, current: 0, total: 0, currentFile: ''});

      // 清理临时文件夹
      if (tempFolder && tempFolder.exists) {
        try {
          tempFolder.delete();
        } catch (e) {}
      }

      const errorMsg = String(error);
      if (errorMsg.includes('String length') || errorMsg.includes('memory') || errorMsg.includes('Memory')) {
        throw new Error(`文件过大(${formatFileSize(fileSize)})，超出处理能力。\n\n请在电脑上解压后，分批导入小于50MB的ZIP文件。`);
      }
      throw error;
    }
  };

  // 将ZIP文件读取为ArrayBuffer（避免Base64字符串长度限制）
  const readZipAsArrayBuffer = async (zipUri: string, fileSize: number): Promise<ArrayBuffer> => {
    console.log('使用ArrayBuffer分批读取策略');

    const BATCH_SIZE = 20 * 1024 * 1024; // 20MB per batch
    const batches: Uint8Array[] = [];
    let offset = 0;

    while (offset < fileSize) {
      const endOffset = Math.min(offset + BATCH_SIZE, fileSize);
      const chunkSize = endOffset - offset;

      const progress = Math.floor((offset / fileSize) * 100);
      setExtractProgress({
        visible: true,
        current: progress,
        total: 100,
        currentFile: `读取中 ${progress}% (${formatFileSize(offset)}/${formatFileSize(fileSize)})`
      });

      console.log(`读取批次: ${Math.floor(offset / BATCH_SIZE) + 1}, 位置: ${formatFileSize(offset)}`);

      try {
        // 读取当前批次为Base64
        const chunkBase64 = await FileSystemLegacy.readAsStringAsync(zipUri, {
          encoding: FileSystemLegacy.EncodingType.Base64,
          position: offset,
          length: chunkSize,
        } as any);

        // 转换为Uint8Array
        const binaryString = atob(chunkBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        batches.push(bytes);
        offset = endOffset;

        // 释放临时数据
        (binaryString as any) = null;
        (chunkBase64 as any) = null;

        // 每2批暂停一下，让GC工作
        if (batches.length % 2 === 0) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      } catch (readError) {
        console.error('读取批次失败:', readError);
        throw new Error(`读取失败于 ${formatFileSize(offset)}`);
      }
    }

    console.log('所有批次读取完成，合并为ArrayBuffer...');
    setExtractProgress({
      visible: true,
      current: 100,
      total: 100,
      currentFile: '合并数据中...'
    });

    // 合并所有批次为单个ArrayBuffer
    const totalLength = batches.reduce((sum, batch) => sum + batch.length, 0);
    const merged = new Uint8Array(totalLength);
    let position = 0;

    for (const batch of batches) {
      merged.set(batch, position);
      position += batch.length;
    }

    // 释放批次数组
    batches.length = 0;
    (batches as any) = null;

    console.log('合并完成，返回ArrayBuffer');
    return merged.buffer;
  };

  // 递归解压 ZIP 内容（带进度）
  const extractZipContents = async (zip: any, targetPath: string, totalFiles: number) => {
    try {
      let processedCount = 0;
      const fileEntries = Object.keys(zip.files).filter(key => !zip.files[key].dir);

      console.log(`开始解压 ${fileEntries.length} 个文件到: ${targetPath}`);

      // 逐个处理文件以更新进度，避免同时加载太多文件到内存
      for (const relativePath of fileEntries) {
        const zipEntry = zip.files[relativePath];

        // 更新进度显示
        processedCount++;
        const fileName = relativePath.split('/').pop() || relativePath;
        setExtractProgress({
          visible: true,
          current: processedCount,
          total: totalFiles,
          currentFile: fileName
        });
        console.log(`[${processedCount}/${totalFiles}] 解压: ${relativePath}`);

        // 构建完整的目标路径
        const fullPath = `${targetPath}${relativePath}`;

        // 确保父目录存在
        const lastSlashIndex = fullPath.lastIndexOf('/');
        if (lastSlashIndex > 0) {
          const parentDir = fullPath.substring(0, lastSlashIndex + 1);
          const parentDirectory = new Directory(parentDir);
          if (!parentDirectory.exists) {
            parentDirectory.create({ intermediates: true });
          }
        }

        // 获取文件数据并写入文件
        try {
          // 根据文件大小选择合适的方式
          let base64Data: string;

          // 尝试使用 blob 方式，对大文件更友好
          try {
            const blob = await zipEntry.async('blob');
            // 将 Blob 转换为 Base64
            const reader = new FileReader();
            base64Data = await new Promise((resolve, reject) => {
              reader.onloadend = () => {
                const result = reader.result as string;
                // 移除 data:*/*;base64, 前缀
                resolve(result.split(',')[1]);
              };
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          } catch (blobError) {
            console.warn('Blob方式失败，使用uint8array方式:', blobError);
            // 回退到 uint8array 方式
            const fileData = await zipEntry.async('uint8array');

            // 将 Uint8Array 转换为 Base64（分块处理大文件）
            const CHUNK_SIZE = 0x8000; // 32KB chunks
            const chunks = [];
            for (let i = 0; i < fileData.length; i += CHUNK_SIZE) {
              const chunk = fileData.slice(i, i + CHUNK_SIZE);
              chunks.push(String.fromCharCode.apply(null, Array.from(chunk)));
            }
            base64Data = btoa(chunks.join(''));
          }

          // 写入文件
          await FileSystemLegacy.writeAsStringAsync(fullPath, base64Data, {
            encoding: FileSystemLegacy.EncodingType.Base64,
          });

          // 立即释放内存
          base64Data = '';

          console.log(`[${processedCount}/${totalFiles}] 完成: ${fileName}`);
        } catch (writeError) {
          console.error(`写入文件失败: ${relativePath}`, writeError);
          throw new Error(`无法写入文件: ${fileName}`);
        }

        // 每处理5个文件，尝试触发垃圾回收（如果可用）
        if (processedCount % 5 === 0) {
          // 给JS引擎一点时间进行垃圾回收
          await new Promise(resolve => setTimeout(resolve, 10));

          if (global.gc) {
            global.gc();
          }
        }
      }

      console.log('所有文件解压完成');
    } catch (error) {
      console.error('解压内容失败:', error);
      throw error;
    }
  };

  // 移动解压的内容到目标位置
  const moveExtractedContents = async (sourcePath: string, destPath: string) => {
    try {
      const sourceDir = new Directory(sourcePath);
      if (!sourceDir.exists) {
        return;
      }

      const contents = sourceDir.list();

      for (const item of contents) {
        const itemName = item.name;
        const sourceItemPath = item.uri;
        const destItemPath = `${destPath}${itemName}`;

        if (item instanceof Directory) {
          // 如果是目录，递归移动
          const destDir = new Directory(destItemPath + '/');
          if (!destDir.exists) {
            destDir.create({ intermediates: true });
          }
          await moveExtractedContents(sourceItemPath + '/', destItemPath + '/');

          // 删除源目录
          const srcDir = new Directory(sourceItemPath + '/');
          if (srcDir.exists) {
            srcDir.delete();
          }
        } else {
          // 如果是文件，移动文件
          const sourceFile = new File(sourceItemPath);
          const destFile = new File(destItemPath);

          // 如果目标文件已存在，先删除
          if (destFile.exists) {
            destFile.delete();
          }

          sourceFile.move(destFile);
        }
      }
    } catch (error) {
      console.error('移动解压内容失败:', error);
      throw error;
    }
  };

  const exportFile = async (item: FileItem) => {
    try {
      if (item.isDirectory) {
        // 对于目录，提示用户将分享整个目录
        Alert.alert(
          '导出文件夹',
          `即将分享文件夹 "${item.name}" 及其所有内容`,
          [
            { text: '取消', style: 'cancel' },
            {
              text: '分享',
              onPress: async () => {
                try {
                  const canShare = await Sharing.isAvailableAsync();
                  if (!canShare) {
                    showToast({ message: '分享功能不可用', backgroundColor: 'red' });
                    return;
                  }

                  // 移除末尾斜杠后分享
                  const cleanUri = item.uri.endsWith('/') ? item.uri.slice(0, -1) : item.uri;
                  await Sharing.shareAsync(cleanUri);
                } catch (error) {
                  console.error('分享文件夹失败:', error);
                  showToast({ message: '分享失败', backgroundColor: 'red' });
                }
              },
            },
          ]
        );
      } else {
        // 对于文件，直接分享
        const canShare = await Sharing.isAvailableAsync();
        if (!canShare) {
          showToast({ message: '分享功能不可用', backgroundColor: 'red' });
          return;
        }
        await Sharing.shareAsync(item.uri);
      }
    } catch (error) {
      console.error('导出失败:', error);
      showToast({ message: '导出失败', backgroundColor: 'red' });
    }
  };

  // 从服务器同步文件
  const syncFromServer = async () => {
    setIsScanning(true);
    try {
      // 调用扫描接口
      const scanUrl = syncURL + '/scan';
      console.log('开始扫描服务器文件...');

      const scanResponse = await fetch(scanUrl);
      if (!scanResponse.ok) {
        throw new Error(`扫描失败: ${scanResponse.status}`);
      }

      const scanData = await scanResponse.json();
      const files = scanData.files.filter((f: any) => f.type === 'file');
      const totalFiles = files.length;

      console.log(`发现 ${totalFiles} 个文件需要同步`);

      // 关闭扫描loading
      setIsScanning(false);

      if (totalFiles === 0) {
        showToast({ message: '没有需要同步的文件', backgroundColor: 'orange' });
        return;
      }

      // 显示确认对话框
      Alert.alert(
        '同步文件',
        `发现 ${totalFiles} 个文件需要同步到当前目录。是否继续？`,
        [
          { text: '取消', style: 'cancel' },
          {
            text: '开始同步',
            onPress: async () => {
              await startSync(files);
            }
          }
        ]
      );
    } catch (error) {
      setIsScanning(false);
      console.error('扫描服务器失败:', error);
      showToast({ message: `扫描服务器失败: ${error instanceof Error ? error.message : String(error)}`, backgroundColor: 'red' });
    }
  };

  // 开始同步文件（优化版：支持并发下载）
  const startSync = async (files: any[]) => {
    const totalFiles = files.length;
    let syncedCount = 0;
    let failedCount = 0;

    setSyncProgress({
      visible: true,
      current: 0,
      total: totalFiles,
      currentFile: '准备同步...',
      status: ''
    });

    try {
      // 使用并发下载提高速度，最多同时下载3个文件
      const concurrencyLimit = 3;
      const downloadQueue = [...files];
      
      // 创建下载任务函数
      const downloadFile = async (file: any) => {
        const fileName = file.name;
        const relativePath = file.path; // 相对路径，如 "folder/subfolder/file.txt"
        const fullPath = file.fullPath; // 完整路径，用于下载

        try {
          // 构建目标路径（保持目录结构）
          const destPath = `${currentPath}${relativePath}`;

          // 确保父目录存在
          const lastSlashIndex = destPath.lastIndexOf('/');
          if (lastSlashIndex > 0) {
            const parentDir = destPath.substring(0, lastSlashIndex + 1);
            const parentDirectory = new Directory(parentDir);
            if (!parentDirectory.exists) {
              console.log(`创建目录: ${parentDir}`);
              parentDirectory.create({ intermediates: true });
            }
          }

          const destFile = new File(destPath);

          // 如果文件已存在，跳过
          if (destFile.exists) {
            console.log(`文件已存在，跳过: ${relativePath}`);
            return { success: true, path: relativePath };
          }

          // 下载文件（使用完整路径）
          const downloadUrl = `${syncURL}/download?path=${encodeURIComponent(fullPath)}`;
          const downloadResponse = await fetch(downloadUrl);

          if (!downloadResponse.ok) {
            throw new Error(`下载失败: ${downloadResponse.status}`);
          }

          // 获取文件数据并保存
          const blob = await downloadResponse.blob();
          const reader = new FileReader();

          await new Promise<void>((resolve, reject) => {
            reader.onloadend = async () => {
              try {
                const base64 = (reader.result as string).split(',')[1];
                await FileSystemLegacy.writeAsStringAsync(destPath, base64, {
                  encoding: FileSystemLegacy.EncodingType.Base64,
                });
                console.log(`成功同步: ${relativePath}`);
                resolve();
              } catch (error) {
                reject(error);
              }
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

          return { success: true, path: relativePath };
        } catch (error) {
          console.error(`同步文件失败 ${relativePath}:`, error);
          return { success: false, path: relativePath, error };
        }
      };

      // 并发执行下载任务
      const executing: Promise<any>[] = [];
      
      for (const file of downloadQueue) {
        const relativePath = file.path;
        
        // 更新进度显示
        setSyncProgress(prev => ({
          ...prev,
          current: syncedCount + failedCount,
          currentFile: relativePath,
          status: `正在下载 ${syncedCount + failedCount + 1}/${totalFiles}`
        }));

        // 创建下载Promise
        const promise = downloadFile(file).then(result => {
          if (result.success) {
            syncedCount++;
          } else {
            failedCount++;
          }
          
          // 从执行队列中移除
          executing.splice(executing.indexOf(promise), 1);
          
          return result;
        });
        
        executing.push(promise);
        
        // 当达到并发限制时，等待其中一个完成
        if (executing.length >= concurrencyLimit) {
          await Promise.race(executing);
        }
      }

      // 等待所有剩余的下载任务完成
      await Promise.all(executing);

      setSyncProgress({
        visible: true,
        current: totalFiles,
        total: totalFiles,
        currentFile: '完成',
        status: `成功: ${syncedCount}, 失败: ${failedCount}`
      });

      // 延迟关闭进度条
      await new Promise(resolve => setTimeout(resolve, 2000));
      setSyncProgress({visible: false, current: 0, total: 0, currentFile: '', status: ''});

      // 刷新文件列表
      await loadFiles();

      showToast({ message: `同步完成\n成功: ${syncedCount} 个文件\n失败: ${failedCount} 个文件` });
    } catch (error) {
      console.error('同步失败:', error);
      setSyncProgress({visible: false, current: 0, total: 0, currentFile: '', status: ''});
      showToast({ message: `同步失败: ${error instanceof Error ? error.message : String(error)}`, backgroundColor: 'red' });
    }
  };

  const renderFileItem = ({ item }: { item: FileItem }) => (
    <TouchableOpacity
      style={[
        styles.fileItem,
        { backgroundColor: themeColors.background },
      ]}
      onPress={() => {
        if (item.isDirectory) {
          navigateToFolder(item.uri, item.name);
        }
      }}
      onLongPress={() => showActionMenu(item)}
    >
      <View style={styles.fileIcon}>
        <Ionicons
          name={item.isDirectory ? 'folder' : 'document-text-outline'}
          size={32}
          color={item.isDirectory ? '#FFD700' : themeColors.tint}
        />
      </View>
      <View style={styles.fileInfo}>
        <Text style={[styles.fileName, { color: themeColors.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={styles.fileMeta}>
          <Text style={[styles.fileSize, { color: themeColors.placeholderText }]} numberOfLines={1}>
            {item.isDirectory ? '文件夹' : (formatFileSize(item.size) + ' ' ) }
          </Text>
          <Text style={[styles.fileDate, { color: themeColors.placeholderText }]} numberOfLines={1}>
            {formatDate(item.modificationTime)}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.moreButton}
        onPress={() => showActionMenu(item)}
      >
        <Ionicons name="ellipsis-vertical" size={20} color={themeColors.placeholderText} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const showActionMenu = (item: FileItem) => {
    const buttons: any[] = [];

    // 添加操作按钮
    buttons.push({ text: '重命名', onPress: () => renameItem_start(item) });
    buttons.push({ text: '导出', onPress: () => exportFile(item) });
    buttons.push({
      text: '删除',
      onPress: () => deleteItem(item),
      style: 'destructive' as const
    });

    // 最后添加取消按钮
    buttons.push({ text: '取消', style: 'cancel' });

    Alert.alert(
      item.name,
      '选择操作',
      buttons
    );
  };

  const getCurrentPathDisplay = () => {
    const parts = currentPath.split('/').filter(Boolean);
    if (parts.length <= 2) return currentPath;
    return '.../' + parts.slice(-2).join('/');
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      {/* 顶部导航栏 */}
      <View style={[styles.header, {
        backgroundColor: themeColors.card,
        paddingTop: Math.max(insets.top, 12),
      }]}>
        <TouchableOpacity
          style={[styles.backButton, { opacity: pathHistory.length === 0 ? 0.3 : 1 }]}
          onPress={goBack}
          disabled={pathHistory.length === 0}
        >
          <Ionicons name="arrow-back" size={24} color={themeColors.tint} />
        </TouchableOpacity>

        <View style={styles.pathContainer}>
          <Text style={[styles.pathText, { color: themeColors.text }]} numberOfLines={1}>
            {getCurrentPathDisplay()}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton} onPress={() => setModalVisible(true)}>
            <Ionicons name="add-circle-outline" size={24} color={themeColors.tint} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={importFile}>
            <Ionicons name="cloud-upload-outline" size={24} color={themeColors.tint} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerButton, isScanning && styles.disabledButton]}
            onPress={syncFromServer}
            disabled={isScanning}
          >
            {isScanning ? (
              <ActivityIndicator size="small" color={themeColors.tint} />
            ) : (
              <Ionicons name="cloud-download-outline" size={24} color={themeColors.tint} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* 文件列表 */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.tint} />
          <Text style={[styles.loadingText, { color: themeColors.placeholderText }]}>加载中...</Text>
        </View>
      ) : files.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="folder-open-outline" size={64} color={themeColors.placeholderText} />
          <Text style={[styles.emptyText, { color: themeColors.placeholderText }]}>此文件夹为空</Text>
        </View>
      ) : (
        <FlatList
          data={files}
          renderItem={renderFileItem}
          keyExtractor={(item) => item.uri}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* 创建文件夹模态框 */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.syncModalOverlay}>
          <View style={[styles.syncModalContent, { backgroundColor: '#FFFFFF' }]}>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>新建文件夹</Text>
            <TextInput
              style={[styles.input, { backgroundColor: themeColors.background, color: themeColors.text }]}
              placeholder="文件夹名称"
              placeholderTextColor={themeColors.placeholderText}
              value={newFolderName}
              onChangeText={setNewFolderName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setModalVisible(false);
                  setNewFolderName('');
                }}
              >
                <Text style={styles.cancelButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={createFolder}
              >
                <Text style={styles.confirmButtonText}>创建</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 解压进度模态框 */}
      <Modal
        visible={extractProgress.visible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {}}
      >
        <View style={styles.syncModalOverlay}>
          <View style={[styles.syncModalContent, { backgroundColor: '#FFFFFF' }]}>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>处理中...</Text>

            <View style={styles.progressContainer}>
              <Text style={[styles.progressText, { color: themeColors.text }]} numberOfLines={2}>
                {extractProgress.currentFile}
              </Text>

              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${extractProgress.total > 0 ? (extractProgress.current / extractProgress.total) * 100 : 0}%`,
                      backgroundColor: themeColors.tint
                    }
                  ]}
                />
              </View>

              <Text style={[styles.progressDetail, { color: themeColors.placeholderText }]}>
                {extractProgress.total > 100
                  ? `${extractProgress.current} / ${extractProgress.total} 文件`
                  : `${extractProgress.current}%`}
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* 重命名模态框 */}
      <Modal
        visible={renameItem !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setRenameItem(null);
          setNewName('');
        }}
      >
        <View style={styles.syncModalOverlay}>
          <View style={[styles.syncModalContent, { backgroundColor: '#FFFFFF' }]}>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>重命名</Text>
            <TextInput
              style={[styles.input, { backgroundColor: themeColors.background, color: themeColors.text }]}
              placeholder="新名称"
              placeholderTextColor={themeColors.placeholderText}
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setRenameItem(null);
                  setNewName('');
                }}
              >
                <Text style={styles.cancelButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={renameItem_execute}
              >
                <Text style={styles.confirmButtonText}>确定</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 同步进度模态框 */}
      <Modal
        visible={syncProgress.visible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {}}
      >
        <View style={styles.syncModalOverlay}>
          <View style={[styles.syncModalContent, { backgroundColor: '#FFFFFF' }]}>
            <View style={styles.syncModalHeader}>
              <Ionicons name="cloud-download" size={32} color={themeColors.tint} />
              <Text style={[styles.syncModalTitle, { color: themeColors.text }]}>正在同步文件</Text>
            </View>

            <View style={styles.syncProgressContainer}>
              <Text style={[styles.syncCurrentFile, { color: themeColors.text }]} numberOfLines={2}>
                {syncProgress.currentFile || '准备中...'}
              </Text>

              <View style={styles.syncProgressBarBg}>
                <View
                  style={[
                    styles.syncProgressBarFill,
                    {
                      width: `${syncProgress.total > 0 ? (syncProgress.current / syncProgress.total) * 100 : 0}%`,
                      backgroundColor: themeColors.tint
                    }
                  ]}
                />
              </View>

              <View style={styles.syncStatsRow}>
                <Text style={[styles.syncStatsText, { color: themeColors.placeholderText }]}>
                  {syncProgress.status || `${syncProgress.current} / ${syncProgress.total} 文件`}
                </Text>
                <Text style={[styles.syncPercentage, { color: themeColors.tint }]}>{syncProgress.total > 0 ? Math.round((syncProgress.current / syncProgress.total) * 100) : 0}%  </Text>
              </View>
            </View>

            <View style={styles.syncModalFooter}>
              <Text style={[styles.syncHintText, { color: themeColors.placeholderText }]}>
                请保持网络连接，不要关闭应用
              </Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  pathContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  pathText: {
    fontSize: 14,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
  },
  listContent: {
    padding: 12,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  fileIcon: {
    marginRight: 12,
  },
  fileInfo: {
    flex: 1,
    minWidth: 0, // 允许 flex 子元素缩小
  },
  fileName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  fileMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  fileSize: {
    fontSize: 12,
    flexShrink: 0,
  },
  fileDate: {
    fontSize: 12,
    flexShrink: 0,
    minWidth: 150, // 确保有足够空间显示完整日期时间
  },
  moreButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    maxWidth: 400,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F0F0F0',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  confirmButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  disabledButton: {
    opacity: 0.5,
  },
  // 同步进度模态框样式
  syncModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  syncModalContent: {
    width: '100%',
    maxWidth: 380,
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  syncModalHeader: {
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  syncModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  syncProgressContainer: {
    gap: 16,
    marginBottom: 20,
  },
  syncCurrentFile: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    minHeight: 44,
    lineHeight: 22,
  },
  syncProgressBarBg: {
    width: '100%',
    height: 10,
    backgroundColor: '#E8E8E8',
    borderRadius: 5,
    overflow: 'hidden',
  },
  syncProgressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  syncStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  syncStatsText: {
    fontSize: 14,
    flex: 1,
  },
  syncPercentage: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  syncModalFooter: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  syncHintText: {
    fontSize: 12,
    textAlign: 'center',
  },
});


