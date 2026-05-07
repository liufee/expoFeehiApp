import {Setting} from './types';
import defaultSetting from './defaultSetting';
import { File, Directory } from 'expo-file-system';
import {AppConfigBasePath} from '../../../constants';
import {deepMerge} from '../../config';
import {userErrorMessage} from '../../util';


export default class SettingService{

    static readonly CONFIG_STORAGE_KEY = AppConfigBasePath + `/app_config${__DEV__ ? '_dev' : ''}.json`;

    private static instance: SettingService;

    private constructor() {}

    static getInstance(): SettingService {
        if (!SettingService.instance) {
            SettingService.instance = new SettingService();
        }
        return SettingService.instance;
    }
    public async getSetting():Promise<[boolean, Setting, string]> {
        try {
            const configFile = new File(SettingService.CONFIG_STORAGE_KEY);
            if (!configFile.exists) {
                return [true, defaultSetting, ''];
            }
            const configData = await configFile.text();
            return [true, deepMerge(defaultSetting, JSON.parse(configData)), ''];
        } catch (e) {
            return [false, defaultSetting, userErrorMessage(e)];
        }
    }

    public async updateSetting(setting: Setting):Promise<[boolean, string]>{
        try {
            const configDir = new Directory(AppConfigBasePath);
            if (!configDir.exists) {
                configDir.create({ intermediates: true });
            }
            const configFile = new File(SettingService.CONFIG_STORAGE_KEY);
            await configFile.write(JSON.stringify(setting), { encoding: 'utf8' });
            return [true, ''];
        } catch (error) {
            return [false, userErrorMessage(error)];
        }
    }
}
