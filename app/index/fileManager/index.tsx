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

interface FileItem {
  name: string;
  uri: string;
  isDirectory: boolean;
  size?: number;
  modificationTime?: number;
}

export default function FileManagerScreen() {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

  const [currentPath, setCurrentPath] = useState<string>(Paths.document.uri);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renameItem, setRenameItem] = useState<FileItem | null>(null);
  const [newName, setNewName] = useState('');
  const [pathHistory, setPathHistory] = useState<string[]>([]);

  useEffect(() => {
    loadFiles();
  }, [currentPath]);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const directory = new Directory(currentPath);
      if (!directory.exists) {
        Alert.alert('错误', '当前路径无效');
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
      Alert.alert('错误', '加载文件列表失败');
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
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('zh-CN') + ' ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) {
      Alert.alert('错误', '请输入文件夹名称');
      return;
    }

    try {
      const newFolder = new Directory(currentPath, newFolderName);

      if (newFolder.exists) {
        Alert.alert('错误', '文件夹已存在');
        return;
      }

      newFolder.create({ intermediates: true });
      setNewFolderName('');
      setModalVisible(false);
      await loadFiles();
      Alert.alert('成功', '文件夹创建成功');
    } catch (error) {
      console.error('创建文件夹失败:', error);
      Alert.alert('错误', '创建文件夹失败');
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
              Alert.alert('成功', '删除成功');
            } catch (error) {
              console.error('删除失败:', error);
              Alert.alert('错误', `删除失败: ${error instanceof Error ? error.message : String(error)}`);
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
      Alert.alert('错误', '请输入新名称');
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
      Alert.alert('成功', '重命名成功');
    } catch (error) {
      console.error('重命名失败:', error);
      Alert.alert('错误', '重命名失败');
    }
  };

  const shareFile = async (item: FileItem) => {
    if (item.isDirectory) {
      Alert.alert('提示', '暂不支持分享文件夹');
      return;
    }

    try {
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('错误', '分享功能不可用');
        return;
      }

      await Sharing.shareAsync(item.uri);
    } catch (error) {
      console.error('分享失败:', error);
      Alert.alert('错误', '分享失败');
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
      Alert.alert('错误', '导入失败');
    }
  };

  const performImport = async (sourceUri: string, destPath: string) => {
    try {
      const sourceFile = new File(sourceUri);
      const destFile = new File(destPath);
      sourceFile.copy(destFile);
      await loadFiles();
      Alert.alert('成功', '导入成功');
    } catch (error) {
      console.error('复制文件失败:', error);
      Alert.alert('错误', '导入失败');
    }
  };

  // 解压并导入 ZIP 文件
  const importAndExtractZip = async (zipUri: string, zipName: string) => {
    try {
      setLoading(true);

      // 读取 ZIP 文件内容
      const zipData = await FileSystemLegacy.readAsStringAsync(zipUri, {
        encoding: FileSystemLegacy.EncodingType.Base64,
      });

      // 加载 ZIP 文件
      const zip = await JSZip.loadAsync(zipData, { base64: true });

      // 创建临时文件夹来解压内容
      const tempFolderName = `temp_extract_${Date.now()}`;
      const tempFolderPath = `${currentPath}${tempFolderName}/`;
      const tempFolder = new Directory(tempFolderPath);
      tempFolder.create({ intermediates: true });

      // 解压所有文件
      await extractZipContents(zip, tempFolderPath);

      // 将解压的内容移动到当前目录
      await moveExtractedContents(tempFolderPath, currentPath);

      // 删除临时文件夹
      if (tempFolder.exists) {
        tempFolder.delete();
      }

      await loadFiles();
      Alert.alert('成功', 'ZIP 文件解压并导入成功');
    } catch (error) {
      console.error('解压 ZIP 文件失败:', error);
      Alert.alert('错误', `解压失败: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  // 递归解压 ZIP 内容
  const extractZipContents = async (zip: any, targetPath: string) => {
    try {
      // 遍历 ZIP 中的所有文件
      const promises = Object.keys(zip.files).map(async (relativePath) => {
        const zipEntry = zip.files[relativePath];

        // 跳过目录条目
        if (zipEntry.dir) {
          return;
        }

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

        // 获取文件数据
        const fileData = await zipEntry.async('base64');

        // 写入文件
        await FileSystemLegacy.writeAsStringAsync(fullPath, fileData, {
          encoding: FileSystemLegacy.EncodingType.Base64,
        });
      });

      await Promise.all(promises);
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
                    Alert.alert('错误', '分享功能不可用');
                    return;
                  }

                  // 移除末尾斜杠后分享
                  const cleanUri = item.uri.endsWith('/') ? item.uri.slice(0, -1) : item.uri;
                  await Sharing.shareAsync(cleanUri);
                } catch (error) {
                  console.error('分享文件夹失败:', error);
                  Alert.alert('错误', '分享失败');
                }
              },
            },
          ]
        );
      } else {
        // 对于文件，直接分享
        const canShare = await Sharing.isAvailableAsync();
        if (!canShare) {
          Alert.alert('错误', '分享功能不可用');
          return;
        }
        await Sharing.shareAsync(item.uri);
      }
    } catch (error) {
      console.error('导出失败:', error);
      Alert.alert('错误', '导出失败');
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
          <Text style={[styles.fileSize, { color: themeColors.placeholderText }]}>
            {item.isDirectory ? '文件夹' : formatFileSize(item.size)}
          </Text>
          <Text style={[styles.fileDate, { color: themeColors.placeholderText }]}>
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
          <TouchableOpacity style={styles.headerButton} onPress={() => router.push('/')}>
            <Ionicons name="arrow-back" size={24} color={themeColors.text} />
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
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.card }]}>
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
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.card }]}>
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
  },
  fileName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  fileMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  fileSize: {
    fontSize: 12,
  },
  fileDate: {
    fontSize: 12,
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
});
