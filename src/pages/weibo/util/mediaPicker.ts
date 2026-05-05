import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import {getABSPath, userErrorMessage} from '../../../util';
import {Alert} from 'react-native';

export interface Asset{
    uri: string,
    fileName: string,
    type: string
    fileSize: number,
}

export function mediaPicker() {

    const selectMedia = async (onSelected:(assets:Asset[])=>void) => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            allowsMultipleSelection: true,
            quality: 1,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            const normalized: Asset[] = result.assets.map((file) => ({
                uri: file.uri,
                fileName: file.fileName ?? '',
                type: file.mimeType ?? 'unknown',
                fileSize: file.fileSize ?? 0,
            }));
            onSelected(normalized);
        }
    };

    const selectAttachment = async (onSelected:(assets:Asset[])=>void) => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                multiple: true,
            });

            if (result.canceled || !result.assets || result.assets.length <= 0) {
                return;
            }

            const normalized: Asset[] = result.assets.map((file) => ({
                uri: getABSPath(file.uri),
                fileName: file.name ?? '',
                type: file.mimeType ?? 'unknown',
                fileSize: file.size ?? 0,
            }));

            onSelected(normalized);

        } catch (err: any) {
            showToast({
                message: '文件选择失败:' + userErrorMessage(err),
                backgroundColor: 'red',
            });
        }
    };

    return {selectMedia, selectAttachment};
};

export interface FileSizeCheckResult {
    passed: boolean;      // 是否通过校验
    totalSizeMB: number;  // 文件总大小 MB
    needsConfirm?: boolean; // 是否需要用户确认
}

export function checkMediaSize(media: Asset[], showTipFilesSize:number, maxTotalFilesSize:number): FileSizeCheckResult {
    let totalSize = 0;
    for (const item of media) {
        if (item.fileSize) totalSize += item.fileSize;
    }
    const totalSizeMB = Math.ceil(totalSize / (1024 * 1024));

    if (maxTotalFilesSize > 0 && totalSizeMB > maxTotalFilesSize) {
        return { passed: false, totalSizeMB };
    }

    if (showTipFilesSize > 0 && totalSizeMB > showTipFilesSize) {
        return { passed: true, totalSizeMB, needsConfirm: true };
    }

    return { passed: true, totalSizeMB };
}

export async function confirmMediaSizeIfNeeded(result: FileSizeCheckResult): Promise<boolean> {
    if (result.needsConfirm) {
        return new Promise((resolve) => {
            Alert.alert(
                '提醒',
                `选择的文件(${result.totalSizeMB}MB)超过提示阈值, 是否继续提交?`,
                [
                    { text: '取消', style: 'cancel', onPress: () => resolve(false) },
                    { text: '继续', onPress: () => resolve(true) },
                ]
            );
        });
    }
    return result.passed;
}
