import { Platform } from 'react-native';

let FileSystem: typeof import('expo-file-system') | null = null;

if (Platform.OS !== 'web') {
    FileSystem = require('expo-file-system');
}else{
    FileSystem = {Paths:{document:{uri:''}}};
}

export const AppStorageBasePath = `${FileSystem.Paths.document.uri}/feehi`;
export const AppDBBasePath = `${AppStorageBasePath}/db`;
export const AppConfigBasePath = `${AppStorageBasePath}/config`;
export const APPRuntimePath = `${AppStorageBasePath}/` + (__DEV__ ? 'runtime_debug' : 'runtime');
export const AppFilesBasePath = `${AppStorageBasePath}/files`;
export const DownloadPath = `${APPRuntimePath}/download`;

export const AppWeiboBasePath = `${AppFilesBasePath}/` + (__DEV__ ? 'weibo_debug' : 'weibo');
export const AppWeiboLargeBasePath = `${AppFilesBasePath}/` + (__DEV__ ? 'large_weibo_debug' : 'large_weibo');
export const AppMoviesBasePath = `${FileSystem.Paths.cache}/Movies/feehi`;
export const AppPicturesBasePath = `${FileSystem.Paths.cache}/Pictures/feehi`;


export const HTTPCDNBaseURL = 'https://img-1251086492.cos.ap-guangzhou.myqcloud.com/feehiapp';
export const HTTPCDNIMGBaseURL = HTTPCDNBaseURL + '/images';

export const FeehiAPPScheme = __DEV__ ? 'feehidebug' : 'feehi';
export const FeehiAPPHost = __DEV__ ? 'feehiappdebug.com' : 'feehiapp.com';

export enum Progress {
    TodayFinishedAbdominal = 'today_finished_abdominal',
    TodayFinishedRun = 'today_finished_run',
    RegisteredBackgroundTasks = 'registered_background_tasks',
    RememberWordPage = 'remember_word_page',
    RememberWordScrollY = 'remember_word_scroll_y',
    LastSelectedWebdav = 'last_selected_webdav',
    LastHandInputRunStartTime = 'last_hand_input_run_start_time',
}

export enum ScheduleTask {
    DAILY_EXERCISE_CHECK = 0,
    ONCE_BACKUP_WEIBO = 1,
    ONCE_BACKUP_EXERCISE = 2,
    ONCE_BACKUP_CHILDREN = 3,
}
