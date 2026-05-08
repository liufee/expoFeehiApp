import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  StatusBar,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as SQLite from 'expo-sqlite';
import { Directory, File } from 'expo-file-system';
import { AppDBBasePath } from '@/constants';

interface TableInfo {
  name: string;
  rowCount?: number;
}

interface ColumnInfo {
  name: string;
  type: string;
  notNull: boolean;
  defaultValue: string | null;
  primaryKey: boolean;
}

interface RowData {
  [key: string]: any;
}

interface DBFileItem {
  name: string;
  uri: string;
  size?: number;
}

export default function SQLiteManagerScreen() {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [rowData, setRowData] = useState<RowData[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(20); // 每页显示20条记录
  const [totalRows, setTotalRows] = useState(0);
  const [showQueryModal, setShowQueryModal] = useState(false);
  const [customQuery, setCustomQuery] = useState('');
  const [queryResults, setQueryResults] = useState<RowData[]>([]);
  const [queryColumns, setQueryColumns] = useState<ColumnInfo[]>([]);
  const [isQueryMode, setIsQueryMode] = useState(false);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');
  const [showTableList, setShowTableList] = useState(true);
  const [showTextModal, setShowTextModal] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [selectedCellInfo, setSelectedCellInfo] = useState<{row: number; column: string} | null>(null);
  const [dbFiles, setDbFiles] = useState<DBFileItem[]>([]);
  const [currentPath, setCurrentPath] = useState<string>(AppDBBasePath);
  const [scrollX, setScrollX] = useState(0);

  // 加载数据库文件列表
  const loadDBFiles = async (path: string) => {
    try {
      setLoading(true);
      const directory = new Directory(path);

      if (!directory.exists) {
        Alert.alert('错误', '目录不存在');
        setLoading(false);
        return;
      }

      const contents = directory.list();
      const dbFileItems: DBFileItem[] = [];

      // 筛选出 .db 和 .sqlite 文件
      for (const item of contents) {
        const isDirectory = item instanceof Directory;
        const name = item.name;
        const uri = item.uri;
        dbFileItems.push({
          name: name,
          uri: uri,
          size: isDirectory ? undefined : (item as File).size || undefined,
        });
      }

      // 排序：文件夹在前，文件在后，按名称排序
      dbFileItems.sort((a, b) => {
        const aIsDir = a.size === undefined;
        const bIsDir = b.size === undefined;
        if (aIsDir && !bIsDir) return -1;
        if (!aIsDir && bIsDir) return 1;
        return a.name.localeCompare(b.name);
      });

      setDbFiles(dbFileItems);
    } catch (error) {
      console.error('加载数据库文件失败:', error);
      Alert.alert('错误', '加载文件列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 选择数据库文件
  const selectDatabase = async (fileUri: string, fileName: string) => {
    try {
      setLoading(true);

      console.log('选择的数据库文件:', fileName, fileUri);

      // 打开数据库连接
      const database = await SQLite.openDatabaseAsync(fileUri);
      setDb(database);

      // 获取所有表
      await loadTables(database);

      Alert.alert('成功', `已加载数据库: ${fileName}`);
    } catch (error) {
      console.error('选择数据库失败:', error);
      Alert.alert('错误', '无法打开数据库文件');
    } finally {
      setLoading(false);
    }
  };

  // 导航到文件夹
  const navigateToFolder = (folderUri: string) => {
    setCurrentPath(folderUri.endsWith('/') ? folderUri : folderUri + '/');
    loadDBFiles(folderUri.endsWith('/') ? folderUri : folderUri + '/');
  };

  // 返回上一级
  const goBack = () => {
    // 如果当前路径不是根路径，返回上一级
    if (currentPath !== AppDBBasePath && currentPath !== AppDBBasePath + '/') {
      const pathParts = currentPath.split('/').filter(Boolean);
      pathParts.pop(); // 移除最后一级
      const parentPath = pathParts.join('/') + '/';
      setCurrentPath(parentPath);
      loadDBFiles(parentPath);
    }
  };

  // 加载所有表
  const loadTables = async (database: SQLite.SQLiteDatabase) => {
    try {
      // 查询所有用户表
      const result = await database.getAllAsync(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%' 
        ORDER BY name
      `);

      const tableNames = result.map((row: any) => row.name);
      const tableInfos: TableInfo[] = [];

      // 获取每个表的行数
      for (const tableName of tableNames) {
        try {
          const countResult = await database.getFirstAsync(`SELECT COUNT(*) as count FROM "${tableName}"`);
          tableInfos.push({
            name: tableName,
            rowCount: (countResult as any)?.count || 0
          });
        } catch (e) {
          tableInfos.push({
            name: tableName,
            rowCount: 0
          });
        }
      }

      setTables(tableInfos);
    } catch (error) {
      console.error('加载表列表失败:', error);
      Alert.alert('错误', '无法加载表列表');
    }
  };

  // 选择表
  const selectTable = async (tableName: string) => {
    setSelectedTable(tableName);
    setCurrentPage(0);
    setSortColumn(null);
    setSortOrder('ASC');
    setShowTableList(false); // 选择表后隐藏表列表
    await loadTableData(tableName, 0);
  };

  // 加载表数据
  const loadTableData = async (tableName: string, page: number, orderBy?: string, order?: 'ASC' | 'DESC') => {
    if (!db) return;

    setLoading(true);
    try {
      // 获取列信息
      const columnsResult = await db.getAllAsync(`PRAGMA table_info("${tableName}")`);
      const columnInfos: ColumnInfo[] = columnsResult.map((col: any) => ({
        name: col.name,
        type: col.type,
        notNull: col.notnull === 1,
        defaultValue: col.dflt_value,
        primaryKey: col.pk === 1
      }));
      setColumns(columnInfos);

      // 获取总行数
      const countResult = await db.getFirstAsync(`SELECT COUNT(*) as count FROM "${tableName}"`);
      const total = (countResult as any)?.count || 0;
      setTotalRows(total);

      // 构建排序子句
      let orderClause = '';
      if (orderBy && order) {
        orderClause = ` ORDER BY "${orderBy}" ${order}`;
      }

      // 获取分页数据
      const offset = page * pageSize;
      const dataResult = await db.getAllAsync(
        `SELECT * FROM "${tableName}"${orderClause} LIMIT ? OFFSET ?`,
        pageSize,
        offset
      );
      setRowData(dataResult as RowData[]);

    } catch (error) {
      console.error('加载表数据失败:', error);
      Alert.alert('错误', '无法加载表数据');
    } finally {
      setLoading(false);
    }
  };

  // 上一页
  const goToPreviousPage = () => {
    if (currentPage > 0 && selectedTable) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      loadTableData(selectedTable, newPage, sortColumn || undefined, sortOrder);
    }
  };

  // 下一页
  const goToNextPage = () => {
    if (selectedTable && (currentPage + 1) * pageSize < totalRows) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      loadTableData(selectedTable, newPage, sortColumn || undefined, sortOrder);
    }
  };

  // 处理列点击排序
  const handleColumnClick = (columnName: string) => {
    if (!selectedTable) return;

    let newOrder: 'ASC' | 'DESC' = 'ASC';

    // 如果点击的是当前排序列，切换排序方向
    if (sortColumn === columnName) {
      newOrder = sortOrder === 'ASC' ? 'DESC' : 'ASC';
    }

    setSortColumn(columnName);
    setSortOrder(newOrder);
    setCurrentPage(0);
    loadTableData(selectedTable, 0, columnName, newOrder);
  };

  // 处理单元格点击显示完整文本
  const handleCellClick = (text: string, rowIndex: number, columnName: string) => {
    if (!text || text === 'NULL') return;

    // 如果文本长度超过一定阈值，显示弹窗
    if (text.length > 50) {
      setSelectedText(text);
      setSelectedCellInfo({ row: rowIndex, column: columnName });
      setShowTextModal(true);
    }
  };

  // 初始化加载数据库文件列表
  useEffect(() => {
    loadDBFiles(currentPath);
  }, [currentPath]);

  // 格式化文件大小
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };
  const closeDatabase = async () => {
    if (db) {
      try {
        await db.closeAsync();
      } catch (error) {
        console.error('关闭数据库失败:', error);
      }
    }
    setDb(null);
    setTables([]);
    setSelectedTable(null);
    setColumns([]);
    setRowData([]);
    setTotalRows(0);
    setCurrentPage(0);
    setIsQueryMode(false);
    setQueryResults([]);
    setQueryColumns([]);
    setCustomQuery('');
  };

  // 执行自定义查询
  const executeCustomQuery = async () => {
    if (!db || !customQuery.trim()) {
      Alert.alert('错误', '请输入SQL查询语句');
      return;
    }

    setLoading(true);
    try {
      // 检查是否是SELECT查询
      const queryUpper = customQuery.trim().toUpperCase();
      if (!queryUpper.startsWith('SELECT')) {
        Alert.alert('提示', '为了安全起见，只允许执行SELECT查询');
        setLoading(false);
        return;
      }

      const result = await db.getAllAsync(customQuery);
      setQueryResults(result as RowData[]);

      // 从结果中提取列名
      if (result.length > 0) {
        const cols = Object.keys(result[0]).map(name => ({
          name,
          type: 'TEXT',
          notNull: false,
          defaultValue: null,
          primaryKey: false
        }));
        setQueryColumns(cols);
      } else {
        setQueryColumns([]);
      }

      setIsQueryMode(true);
      setShowQueryModal(false);
    } catch (error) {
      console.error('执行查询失败:', error);
      Alert.alert('错误', `查询执行失败: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  // 返回表浏览模式
  const backToTableBrowse = () => {
    setIsQueryMode(false);
    setQueryResults([]);
    setQueryColumns([]);
    setCustomQuery('');
    if (selectedTable) {
      loadTableData(selectedTable, currentPage, sortColumn || undefined, sortOrder);
    }
  };

  // 渲染表项
  const renderTableItem = ({ item }: { item: TableInfo }) => (
    <TouchableOpacity
      style={[
        styles.tableItem,
        { backgroundColor: themeColors.card },
        selectedTable === item.name && styles.selectedTableItem
      ]}
      onPress={() => selectTable(item.name)}
    >
      <View style={styles.tableInfo}>
        <Ionicons
          name="table"
          size={20}
          color={themeColors.tint}
        />
        <Text style={[styles.tableName, { color: themeColors.text }]}>
          {item.name}
        </Text>
      </View>
      <Text style={[styles.rowCount, { color: themeColors.textSecondary }]}>
        {item.rowCount} 行
      </Text>
    </TouchableOpacity>
  );

  // 渲染数据行
  const renderDataRow = ({ item, index }: { item: RowData; index: number }) => {
    // 每个列固定宽度200px，确保与列头一致
    const columnWidth = 200;
    const totalWidth = columns.length * columnWidth;
    
    return (
      <View style={[styles.dataRow, { backgroundColor: index % 2 === 0 ? themeColors.background : themeColors.card, width: totalWidth }]}>
        {columns.map((column, colIndex) => {
          const cellValue = item[column.name];
          const displayText = cellValue !== null && cellValue !== undefined
            ? String(cellValue)
            : 'NULL';
          const isLongText = displayText.length > 50;

          return (
            <TouchableOpacity
              key={colIndex}
              style={[
                styles.dataCell,
                {
                  width: columnWidth,
                  minWidth: columnWidth,
                  maxWidth: columnWidth,
                  borderRightWidth: 1,
                  borderRightColor: themeColors.border || '#e0e0e0'
                }
              ]}
              onPress={() => handleCellClick(displayText, index, column.name)}
              activeOpacity={isLongText ? 0.7 : 1}
            >
              <Text
                style={[
                  styles.dataCellText,
                  { color: themeColors.text }
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {displayText}
              </Text>
              {isLongText && (
                <Ionicons name="ellipsis-horizontal" size={12} color={themeColors.textSecondary} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // 渲染列头
  const renderColumnHeader = () => {
    // 每个列固定宽度200px
    const columnWidth = 200;
    const totalWidth = columns.length * columnWidth;
    
    return (
      <View style={[styles.columnHeader, { backgroundColor: themeColors.card, width: totalWidth }]}>
        {columns.map((column, index) => {
          const isSorted = sortColumn === column.name;
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.columnHeaderCell,
                { 
                  width: columnWidth,
                  minWidth: columnWidth,
                  maxWidth: columnWidth,
                  borderRightWidth: 1,
                  borderRightColor: themeColors.border || '#e0e0e0'
                }
              ]}
              onPress={() => handleColumnClick(column.name)}
              activeOpacity={0.7}
            >
              <View style={styles.columnHeaderContent}>
                <Text
                  style={[
                    styles.columnHeaderText,
                    { color: isSorted ? themeColors.tint : themeColors.text }
                  ]}
                  numberOfLines={1}
                >
                  {column.name}
                </Text>
                <View style={styles.columnHeaderIcons}>
                  {column.primaryKey && (
                    <Ionicons name="key" size={12} color={themeColors.tint} />
                  )}
                  {isSorted && (
                    <Ionicons
                      name={sortOrder === 'ASC' ? 'arrow-up' : 'arrow-down'}
                      size={14}
                      color={themeColors.tint}
                    />
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: themeColors.background,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right
      }
    ]}>
      {/* 状态栏 */}
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* 头部 */}
      <View style={[styles.header, { backgroundColor: themeColors.card }]}>
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>
          SQLite 管理器
        </Text>

        {db && (
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={[styles.headerButton, { backgroundColor: themeColors.tint }]}
              onPress={() => setShowQueryModal(true)}
            >
              <Ionicons name="code" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerButton, { backgroundColor: '#ff4444' }]}
              onPress={closeDatabase}
            >
              <Ionicons name="close-circle" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {!db ? (
        // 未选择数据库时显示
        <View style={styles.container}>
          {/* 头部导航 */}
          <View style={[styles.fileBrowserHeader, { backgroundColor: themeColors.card }]}>
            <TouchableOpacity
              style={styles.backButtonSmall}
              onPress={goBack}
              disabled={currentPath === AppDBBasePath || currentPath === AppDBBasePath + '/'}
            >
              <Ionicons
                name="arrow-back"
                size={20}
                color={currentPath === AppDBBasePath || currentPath === AppDBBasePath + '/' ? '#999' : themeColors.tint}
              />
            </TouchableOpacity>
            <Text style={[styles.pathText, { color: themeColors.text }]} numberOfLines={1}>
              {currentPath.replace(AppDBBasePath, 'db')}
            </Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={themeColors.tint} />
            </View>
          ) : (
            <FlatList
              data={dbFiles}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.fileItem, { backgroundColor: themeColors.card }]}
                  onPress={() => {
                    if (item.size === undefined) {
                      // 是文件夹
                      navigateToFolder(item.uri);
                    } else {
                      // 是数据库文件
                      selectDatabase(item.uri, item.name);
                    }
                  }}
                >
                  <View style={styles.fileItemInfo}>
                    <Ionicons
                      name={item.size === undefined ? "folder" : "document-text"}
                      size={24}
                      color={item.size === undefined ? themeColors.tint : themeColors.textSecondary}
                    />
                    <Text style={[styles.fileName, { color: themeColors.text }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </View>
                  {item.size !== undefined && (
                    <Text style={[styles.fileSize, { color: themeColors.textSecondary }]}>
                      {formatFileSize(item.size)}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.uri}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="document-text-outline" size={64} color={themeColors.tint} />
                  <Text style={[styles.emptyText, { color: themeColors.text }]}>
                    此目录下没有数据库文件
                  </Text>
                  <Text style={[styles.emptySubText, { color: themeColors.textSecondary }]}>
                    支持 .db、.sqlite、.sqlite3 格式
                  </Text>
                </View>
              }
            />
          )}
        </View>
      ) : (
        // 已选择数据库时显示
        <View style={styles.content}>
          {/* 表和数据显示区域 */}
          <View style={styles.mainContent}>
            {/* 左侧表列表 - 可隐藏 */}
            {showTableList && (
              <View style={[styles.tableListContainer, { backgroundColor: themeColors.card }]}>
                <View style={styles.tableListHeader}>
                  <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
                    表列表 ({tables.length})
                  </Text>
                  <TouchableOpacity
                    style={styles.hideButton}
                    onPress={() => setShowTableList(false)}
                  >
                    <Ionicons name="chevron-back" size={20} color={themeColors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={tables}
                  renderItem={renderTableItem}
                  keyExtractor={(item) => item.name}
                  style={styles.tableList}
                />
              </View>
            )}

            {/* 右侧数据展示 */}
            <View style={styles.dataContainer}>
              {isQueryMode ? (
                // 查询结果模式
                <>
                  <View style={[styles.dataHeader, { backgroundColor: themeColors.card }]}>
                    <View style={styles.dataHeaderLeft}>
                      {!showTableList && selectedTable && (
                        <TouchableOpacity
                          style={styles.showTableButton}
                          onPress={() => setShowTableList(true)}
                        >
                          <Ionicons name="menu" size={20} color={themeColors.tint} />
                        </TouchableOpacity>
                      )}
                      <Text style={[styles.dataTitle, { color: themeColors.text }]}>
                        查询结果
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.backButton, { backgroundColor: themeColors.tint }]}
                      onPress={backToTableBrowse}
                    >
                      <Ionicons name="arrow-back" size={16} color="#fff" />
                      <Text style={styles.backButtonText}>返回</Text>
                    </TouchableOpacity>
                  </View>

                  {loading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="large" color={themeColors.tint} />
                    </View>
                  ) : queryColumns.length > 0 ? (
                    <>
                      {/* 水平滚动容器 - 列头和数据一起滚动 */}
                      <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={true}
                      >
                        <View>
                          {/* 列头 */}
                          <View style={styles.columnHeaderContainer}>
                            <View style={[styles.columnHeader, { backgroundColor: themeColors.card, width: queryColumns.length * 200 }]}>
                              {queryColumns.map((column, index) => (
                                <View key={index} style={[styles.columnHeaderCell, { width: 200, minWidth: 200, maxWidth: 200, borderRightWidth: 1, borderRightColor: themeColors.border || '#e0e0' }]}>
                                  <Text
                                    style={[
                                      styles.columnHeaderText,
                                      { color: themeColors.text }
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {column.name}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          </View>

                          {/* 数据列表 */}
                          <FlatList
                            data={queryResults}
                            renderItem={({ item, index }) => {
                              const totalWidth = queryColumns.length * 200;
                              return (
                                <View style={[styles.dataRow, { backgroundColor: index % 2 === 0 ? themeColors.background : themeColors.card, width: totalWidth }]}>
                                  {queryColumns.map((column, colIndex) => {
                                    const cellValue = item[column.name];
                                    const displayText = cellValue !== null && cellValue !== undefined 
                                      ? String(cellValue) 
                                      : 'NULL';
                                    const isLongText = displayText.length > 50;
                                                              
                                    return (
                                      <TouchableOpacity
                                        key={colIndex}
                                        style={[styles.dataCell, { width: 200, minWidth: 200, maxWidth: 200, borderRightWidth: 1, borderRightColor: themeColors.border || '#e0e0e0' }]}
                                        onPress={() => handleCellClick(displayText, index, column.name)}
                                        activeOpacity={isLongText ? 0.7 : 1}
                                      >
                                        <Text 
                                          style={[styles.dataCellText, { color: themeColors.text }]}
                                          numberOfLines={1}
                                          ellipsizeMode="tail"
                                        >
                                          {displayText}
                                        </Text>
                                        {isLongText && (
                                          <Ionicons name="ellipsis-horizontal" size={12} color={themeColors.textSecondary} />
                                        )}
                                      </TouchableOpacity>
                                    );
                                  })}
                                </View>
                              );
                            }}
                            keyExtractor={(item, index) => `${index}`}
                            style={styles.dataList}
                            scrollEnabled={false}
                            ListEmptyComponent={
                              <View style={styles.emptyDataContainer}>
                                <Text style={[styles.emptyDataText, { color: themeColors.textSecondary }]}>
                                  查询结果为空
                                </Text>
                              </View>
                            }
                          />
                        </View>
                      </ScrollView>

                      {/* 结果显示 */}
                      <View style={[styles.paginationControls, { backgroundColor: themeColors.card }]}>
                        <Text style={[styles.pageText, { color: themeColors.text }]}>
                          共 {queryResults.length} 条结果
                        </Text>
                      </View>
                    </>
                  ) : (
                    <View style={styles.loadingContainer}>
                      <Text style={[styles.emptyDataText, { color: themeColors.textSecondary }]}>
                        无数据
                      </Text>
                    </View>
                  )}
                </>
              ) : selectedTable ? (
                <>
                  <View style={[styles.dataHeader, { backgroundColor: themeColors.card }]}>
                    <View style={styles.dataHeaderLeft}>
                      {!showTableList && (
                        <TouchableOpacity
                          style={styles.showTableButton}
                          onPress={() => setShowTableList(true)}
                        >
                          <Ionicons name="menu" size={20} color={themeColors.tint} />
                        </TouchableOpacity>
                      )}
                      <Text style={[styles.dataTitle, { color: themeColors.text }]}>
                        {selectedTable}
                      </Text>
                    </View>
                    <Text style={[styles.paginationInfo, { color: themeColors.textSecondary }]}>
                      第 {currentPage + 1}/{Math.ceil(totalRows / pageSize) || 1} 页
                      (共 {totalRows} 行)
                    </Text>
                  </View>

                  {loading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="large" color={themeColors.tint} />
                    </View>
                  ) : columns.length > 0 ? (
                    <>
                      {/* 水平滚动容器 - 列头和数据一起滚动 */}
                      <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={true}
                      >
                        <View>
                          {/* 列头 */}
                          <View style={styles.columnHeaderContainer}>
                            {renderColumnHeader()}
                          </View>

                          {/* 数据列表 */}
                          <FlatList
                            data={rowData}
                            renderItem={renderDataRow}
                            keyExtractor={(item, index) => `${index}`}
                            style={styles.dataList}
                            scrollEnabled={false} // 禁用垂直滚动，由外层控制
                            ListEmptyComponent={
                              <View style={styles.emptyDataContainer}>
                                <Text style={[styles.emptyDataText, { color: themeColors.textSecondary }]}>
                                  该表没有数据
                                </Text>
                              </View>
                            }
                          />
                        </View>
                      </ScrollView>

                      {/* 分页控制 */}
                      <View style={[styles.paginationControls, { backgroundColor: themeColors.card }]}>
                        <TouchableOpacity
                          style={[
                            styles.pageButton,
                            { backgroundColor: themeColors.tint },
                            currentPage === 0 && styles.disabledButton
                          ]}
                          onPress={goToPreviousPage}
                          disabled={currentPage === 0}
                        >
                          <Ionicons
                            name="chevron-back"
                            size={20}
                            color={currentPage === 0 ? '#999' : '#fff'}
                          />
                        </TouchableOpacity>

                        <Text style={[styles.pageText, { color: themeColors.text }]}>
                          {currentPage + 1} / {Math.ceil(totalRows / pageSize) || 1}
                        </Text>

                        <TouchableOpacity
                          style={[
                            styles.pageButton,
                            { backgroundColor: themeColors.tint },
                            (currentPage + 1) * pageSize >= totalRows && styles.disabledButton
                          ]}
                          onPress={goToNextPage}
                          disabled={(currentPage + 1) * pageSize >= totalRows}
                        >
                          <Ionicons
                            name="chevron-forward"
                            size={20}
                            color={(currentPage + 1) * pageSize >= totalRows ? '#999' : '#fff'}
                          />
                        </TouchableOpacity>
                      </View>
                    </>
                  ) : (
                    <View style={styles.loadingContainer}>
                      <Text style={[styles.emptyDataText, { color: themeColors.textSecondary }]}>
                        加载中...
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.noTableSelected}>
                  {!showTableList && (
                    <TouchableOpacity
                      style={styles.showTableButtonLarge}
                      onPress={() => setShowTableList(true)}
                    >
                      <Ionicons name="menu" size={32} color={themeColors.tint} />
                      <Text style={[styles.showTableText, { color: themeColors.text }]}>
                        显示表列表
                      </Text>
                    </TouchableOpacity>
                  )}
                  <Ionicons name="arrow-left" size={48} color={themeColors.tint} />
                  <Text style={[styles.noTableText, { color: themeColors.text }]}>
                    {showTableList ? '请从左侧选择一个表查看数据' : '点击右上角菜单按钮显示表列表'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      )}

      {loading && !db && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={themeColors.tint} />
        </View>
      )}

      {/* 自定义查询模态框 */}
      <Modal
        visible={showQueryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowQueryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>
                执行 SQL 查询
              </Text>
              <TouchableOpacity
                onPress={() => setShowQueryModal(false)}
              >
                <Ionicons name="close" size={24} color={themeColors.text} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalDescription, { color: themeColors.textSecondary }]}>
              请输入 SELECT 查询语句（仅支持查询操作）
            </Text>

            <TextInput
              style={[
                styles.queryInput,
                {
                  backgroundColor: themeColors.background,
                  color: themeColors.text,
                  borderColor: themeColors.border || '#ddd'
                }
              ]}
              multiline
              numberOfLines={6}
              placeholder="例如: SELECT * FROM users WHERE age > 18"
              placeholderTextColor={themeColors.textSecondary}
              value={customQuery}
              onChangeText={setCustomQuery}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#999' }]}
                onPress={() => setShowQueryModal(false)}
              >
                <Text style={styles.modalButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: themeColors.tint }]}
                onPress={executeCustomQuery}
              >
                <Text style={styles.modalButtonText}>执行查询</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 文本查看弹窗 */}
      <Modal
        visible={showTextModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowTextModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.textModalContent, { backgroundColor: themeColors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>
                {selectedCellInfo ? `${selectedCellInfo.column} (行 ${selectedCellInfo.row + 1})` : '文本内容'}
              </Text>
              <TouchableOpacity
                onPress={() => setShowTextModal(false)}
              >
                <Ionicons name="close" size={24} color={themeColors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={[
                styles.textScrollView,
                { backgroundColor: themeColors.background }
              ]}
              contentContainerStyle={styles.textScrollContent}
            >
              <Text style={[styles.fullText, { color: themeColors.text }]}>
                {selectedText}
              </Text>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: themeColors.tint }]}
                onPress={() => setShowTextModal(false)}
              >
                <Text style={styles.modalButtonText}>关闭</Text>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 50 : 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 6,
    borderRadius: 4,
  },
  fileBrowserHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    gap: 8,
  },
  backButtonSmall: {
    padding: 4,
  },
  pathText: {
    fontSize: 14,
    flex: 1,
  },
  fileItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  fileItemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    flex: 1,
  },
  fileSize: {
    fontSize: 12,
  },
  emptySubText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 32,
    textAlign: 'center',
  },
  selectButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  selectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
  },
  tableListContainer: {
    width: 250,
    borderRightWidth: 1,
    borderRightColor: '#eee',
  },
  tableListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  hideButton: {
    padding: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tableList: {
    flex: 1,
  },
  tableItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedTableItem: {
    backgroundColor: '#e3f2fd',
  },
  tableInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tableName: {
    fontSize: 14,
    fontWeight: '500',
  },
  rowCount: {
    fontSize: 12,
  },
  dataContainer: {
    flex: 1,
  },
  dataHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dataHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  showTableButton: {
    padding: 4,
  },
  showTableButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  showTableText: {
    fontSize: 16,
    fontWeight: '600',
  },
  dataTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  paginationInfo: {
    fontSize: 12,
  },
  columnHeaderContainer: {
    borderBottomWidth: 2,
    borderBottomColor: '#ddd',
  },
  columnHeader: {
    flexDirection: 'row',
    padding: 8,
  },
  columnHeaderCell: {
    flex: 1,
    minWidth: 100,
  },
  columnHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  columnHeaderIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  columnHeaderText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dataList: {
    flex: 1,
  },
  dataRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dataCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4,
  },
  dataCellText: {
    fontSize: 12,
    flex: 1,
  },
  paginationControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  pageButton: {
    padding: 8,
    borderRadius: 4,
  },
  disabledButton: {
    opacity: 0.5,
  },
  pageText: {
    fontSize: 14,
    fontWeight: '500',
  },
  noTableSelected: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noTableText: {
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyDataText: {
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalDescription: {
    fontSize: 14,
    marginBottom: 12,
  },
  queryInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  textModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  textScrollView: {
    maxHeight: 400,
    borderRadius: 8,
    marginVertical: 12,
  },
  textScrollContent: {
    padding: 12,
  },
  fullText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});
