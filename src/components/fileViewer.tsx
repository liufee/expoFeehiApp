import * as Linking from 'expo-linking';
import { File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

/**
 * 文件类型判断
 */
const getFileType = (fileName: string): string => {
    const extension = fileName.toLowerCase().split('.').pop() || '';

    // 图片格式
    const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
    if (imageTypes.includes(extension)) {
        return 'image';
    }

    // PDF 格式
    if (extension === 'pdf') {
        return 'pdf';
    }

    // 视频格式
    const videoTypes = ['mp4', 'mov', 'avi', 'mkv', 'flv', 'wmv', 'webm', 'm4v'];
    if (videoTypes.includes(extension)) {
        return 'video';
    }

    // Office 文档格式
    const officeTypes = [
        'doc', 'docx',           // Word
        'xls', 'xlsx',           // Excel
        'ppt', 'pptx',           // PowerPoint
        'txt', 'rtf',            // 文本
        'csv',                   // CSV
        'odt', 'ods', 'odp',     // OpenOffice
    ];
    if (officeTypes.includes(extension)) {
        return 'office';
    }

    return 'other';
};

/**
 * 获取文件的 MIME 类型
 */
const getMimeType = (fileName: string): string => {
    const extension = fileName.toLowerCase().split('.').pop() || '';

    const mimeTypes: { [key: string]: string } = {
        // 图片
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'bmp': 'image/bmp',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',

        // PDF
        'pdf': 'application/pdf',

        // 视频
        'mp4': 'video/mp4',
        'mov': 'video/quicktime',
        'avi': 'video/x-msvideo',
        'mkv': 'video/x-matroska',
        'webm': 'video/webm',
        'm4v': 'video/x-m4v',

        // Office
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'ppt': 'application/vnd.ms-powerpoint',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'txt': 'text/plain',
        'rtf': 'application/rtf',
        'csv': 'text/csv',
    };

    return mimeTypes[extension] || 'application/octet-stream';
};

/**
 * 从文件路径中提取文件名
 */
const getFileNameFromPath = (filePath: string): string => {
    return filePath.split('/').pop() || filePath;
};

/**
 * 预览或分享文件
 * @param filePath 文件路径
 */
export const fileViewer = async (filePath: string): Promise<void> => {
    try {
        const fileName = getFileNameFromPath(filePath);
        console.log('预览文件:', fileName);
        console.log('文件路径:', filePath);

        // 使用新的 File API 检查文件是否存在
        const file = new File(filePath);
        if (!file.exists) {
            throw new Error('文件不存在');
        }

        const fileType = getFileType(fileName);
        console.log('文件类型:', fileType);

        // 对于图片、PDF、视频、Office 文档，使用浏览器打开
        if (['image', 'pdf', 'video', 'office'].includes(fileType)) {
            await openWithBrowser(filePath, fileName);
        } else {
            // 其他文件类型，调用分享功能
            await shareFile(filePath, fileName);
        }
    } catch (error) {
        console.error('文件预览失败:', error);
        throw error;
    }
};

/**
 * 使用系统浏览器打开文件
 */
const openWithBrowser = async (filePath: string, fileName: string): Promise<void> => {
    try {
        // 构建文件 URI
        let fileUri = filePath;

        // 确保 URI 格式正确
        if (!fileUri.startsWith('file://') && !fileUri.startsWith('http://') && !fileUri.startsWith('https://')) {
            fileUri = `file://${fileUri}`;
        }

        console.log('使用浏览器打开:', fileUri);

        // 使用 expo-linking 打开文件
        const canOpen = await Linking.canOpenURL(fileUri);
        if (canOpen) {
            await Linking.openURL(fileUri);
            console.log('文件已在浏览器中打开');
        } else {
            console.warn('无法使用浏览器打开此文件类型，尝试分享');
            // 如果无法直接打开，则使用分享
            await shareFile(filePath, fileName);
        }
    } catch (error) {
        console.error('使用浏览器打开失败:', error);
        // 失败时尝试分享
        await shareFile(filePath, fileName);
    }
};

/**
 * 分享文件
 */
const shareFile = async (filePath: string, fileName: string): Promise<void> => {
    try {
        console.log('分享文件:', fileName);

        // 检查分享功能是否可用
        const canShare = await Sharing.isAvailableAsync();
        if (!canShare) {
            throw new Error('分享功能不可用');
        }

        // 分享文件
        await Sharing.shareAsync(filePath, {
            mimeType: getMimeType(fileName),
            dialogTitle: `分享 ${fileName}`,
            UTI: getUTI(fileName), // iOS 统一类型标识符
        });

        console.log('文件分享成功');
    } catch (error) {
        console.error('文件分享失败:', error);
        throw error;
    }
};

/**
 * 获取 iOS UTI (Uniform Type Identifier)
 */
const getUTI = (fileName: string): string | undefined => {
    if (Platform.OS !== 'ios') {
        return undefined;
    }

    const extension = fileName.toLowerCase().split('.').pop() || '';

    const utiMap: { [key: string]: string } = {
        // 图片
        'jpg': 'public.jpeg',
        'jpeg': 'public.jpeg',
        'png': 'public.png',
        'gif': 'com.compuserve.gif',
        'bmp': 'com.microsoft.bmp',

        // PDF
        'pdf': 'com.adobe.pdf',

        // 视频
        'mp4': 'public.mpeg-4',
        'mov': 'com.apple.quicktime-movie',

        // Office
        'doc': 'com.microsoft.word.doc',
        'docx': 'org.openxmlformats.wordprocessingml.document',
        'xls': 'com.microsoft.excel.xls',
        'xlsx': 'org.openxmlformats.spreadsheetml.sheet',
        'ppt': 'com.microsoft.powerpoint.ppt',
        'pptx': 'org.openxmlformats.presentationml.presentation',
    };

    return utiMap[extension];
};

/**
 * 批量预览/分享文件
 */
export const filesViewer = async (filePaths: string[]): Promise<void> => {
    for (const filePath of filePaths) {
        try {
            await fileViewer(filePath);
            // 每个文件之间稍微延迟，避免过快触发
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
            const fileName = getFileNameFromPath(filePath);
            console.error(`处理文件 ${fileName} 失败:`, error);
            // 继续处理下一个文件
        }
    }
};

export default {
    fileViewer,
    filesViewer,
    getFileType,
};
