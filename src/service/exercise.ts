import { exerciseDB } from '../db/exercise';
import { Record, RecordType, Status } from '../db/model';
import * as FileSystem from 'expo-file-system';
import {generateTSR} from "@/src/util/tsr";

export class ExerciseService {
  private static instance: ExerciseService;
  private dbInitialized = false;

  private constructor() {}

  static getInstance(): ExerciseService {
    if (!ExerciseService.instance) {
      ExerciseService.instance = new ExerciseService();
    }
    return ExerciseService.instance;
  }

  async initDB(): Promise<void> {
    if (!this.dbInitialized) {
      await exerciseDB.init();
      this.dbInitialized = true;
    }
  }

  async saveRecord(record: Omit<Record, 'id'>): Promise<[boolean, string]> {
    try {
      await this.initDB();

      // 组装 ext 字段
      const ext = this.assembleExt(record);

      // 构建数据库记录对象
      const dbRecord: any = {
        type: record.type,
        start_at: record.startAt,
        end_at: record.endAt,
        status: record.status,
        ext: ext,
        tsr: '',
        tsrType: 'exercise',
        paths: '',
      };

      // 如果是跑步记录，处理路径数据
      if (record.type === RecordType.RecordTypeRun) {
        let pathStr = '';
        for (let i in record.run.paths) {
          const path = record.run.paths[i];
          pathStr += path.latitude + ',' + path.longitude + ',' + path.time + ';';
        }
        if (pathStr.endsWith(';')) {
          pathStr = pathStr.slice(0, -1);  // 删除最后一个字符
        }
        dbRecord.paths = pathStr;
      }

      // 生成 TSR（如果启用）
      // TODO: 这里需要根据设置判断是否启用 TSR
      const enableTSR = true; // 可以从配置中读取
      if (enableTSR) {
        const originStr = this.assembleStrToCreateTSRByRecord(dbRecord);
        const [result, info] = await generateTSR(originStr);
        if (!result) {
          return [false, '创建tsr失败:' + info];
        }
        dbRecord.tsr = info;
      }

      // 保存记录到数据库
      const id = await exerciseDB.saveRecord({
        ...record,
        tsr: dbRecord.tsr ? parseInt(dbRecord.tsr) : 0,
      });

      return [true, id];
    } catch (error) {
      console.error('Failed to save record:', error);
      return [false, '保存记录失败'];
    }
  }

  async updateRecord(id: string, record: Partial<Record>): Promise<[boolean, string]> {
    try {
      await this.initDB();

      // 组装 ext 字段
      const ext = this.assembleExt(record as any);

      // 构建数据库记录对象
      const dbRecord: any = {
        type: record.type,
        start_at: record.startAt,
        end_at: record.endAt,
        status: record.status,
        ext: ext,
        tsr: '',
        tsrType: 'exercise',
        paths: '',
      };

      // 生成 TSR（如果启用）
      const enableTSR = false; // 可以从配置中读取
      if (enableTSR) {
        const originStr = this.assembleStrToCreateTSRByRecord(dbRecord);
        const [result, info] = await generateTSR(originStr);
        if (!result) {
          return [false, '创建tsr失败:' + info];
        }
        dbRecord.tsr = info;
      }

      await exerciseDB.updateRecord(id, {
        ...record,
        tsr: dbRecord.tsr ? parseInt(dbRecord.tsr) : 0,
      });
      return [true, ''];
    } catch (error) {
      console.error('Failed to update record:', error);
      return [false, '更新记录失败'];
    }
  }

  async deleteRecord(id: string): Promise<[boolean, string]> {
    try {
      await this.initDB();
      await exerciseDB.deleteRecord(id);
      return [true, ''];
    } catch (error) {
      console.error('Failed to delete record:', error);
      return [false, '删除记录失败'];
    }
  }

  async getRecordsByPage(
    types: RecordType[],
    page: number,
    perPage: number,
    startTime?: string,
    endTime?: string,
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<[boolean, any[], string]> {
    try {
      await this.initDB();
      const rows = await exerciseDB.getRecordsByPage(types, page, perPage, startTime, endTime, sortOrder);
      return [true, rows, ''];
    } catch (error) {
      console.error('Failed to get records:', error);
      return [false, [], '获取记录失败'];
    }
  }

  async getRecordById(id: string): Promise<[boolean, any, string]> {
    try {
      await this.initDB();
      const record = await exerciseDB.getRecordById(id);
      return [true, record, ''];
    } catch (error) {
      console.error('Failed to get record:', error);
      return [false, null, '获取记录失败'];
    }
  }

  async getDailyExercises(
    types: RecordType[],
    startTime: string,
    endTime: string,
    sortOrder: 'asc' | 'desc' = 'asc'
  ): Promise<[boolean, any[], string]> {
    try {
      await this.initDB();
      const dailyExercises = await exerciseDB.getDailyExercises(types, startTime, endTime, sortOrder);
      return [true, dailyExercises, ''];
    } catch (error) {
      console.error('Failed to get daily exercises:', error);
      return [false, [], '获取每日锻炼失败'];
    }
  }

  // 视频下载功能
  async downloadVideo(remoteUrl: string, localPath: string): Promise<[boolean, string, string]> {
    try {
      // 确保目录存在
      const dirPath = localPath.substring(0, localPath.lastIndexOf('/'));
      const dirInfo = await FileSystem.getInfoAsync(dirPath);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
      }

      // 检查文件是否已存在
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      if (fileInfo.exists) {
        return [true, localPath, ''];
      }

      // 使用新的downloadAsync API
      const downloadResult = await FileSystem.downloadAsync(remoteUrl, localPath);

      if (downloadResult.status === 200) {
        return [true, downloadResult.uri, ''];
      } else {
        // 清理失败的文件
        const fileExists = await FileSystem.getInfoAsync(downloadResult.uri);
        if (fileExists.exists) {
          await FileSystem.deleteAsync(downloadResult.uri);
        }
        return [false, '', `下载失败: ${downloadResult.status}`];
      }
    } catch (error) {
      console.error('Failed to download video:', error);
      // 清理可能存在的临时文件
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(localPath);
      }
      return [false, '', '下载失败'];
    }
  }

  async checkVideoExists(localPath: string): Promise<boolean> {
    const fileInfo = await FileSystem.getInfoAsync(localPath);
    return fileInfo.exists;
  }

  /**
   * 组装 ext 字段
   */
  private assembleExt(record: Omit<Record, 'id'>): string {
    let ext = '';
    if (record.type === RecordType.RecordTypeAbdominal) {
      ext = '';
    } else if (record.type === RecordType.RecordTypeSitUpPushUp) {
      ext = `${record.sitUpPushUp.pushUp},${record.sitUpPushUp.sitUp},${record.sitUpPushUp.curlUp},${record.sitUpPushUp.legsUpTheWallPose}`;
    } else if (record.type === RecordType.RecordTypeRun) {
      ext = `${record.run.avgPace},${record.run.distance},${record.run.runDuration},${record.run.runningWithoutPosition}`;
    }
    return ext;
  }

  /**
   * 组装用于创建 TSR 的字符串
   */
  private assembleStrToCreateTSRByRecord(dbRecord: any): string {
    let paths = '';
    if (dbRecord.paths !== undefined) {
      paths = dbRecord.paths;
    }
    return `${dbRecord.type}+${dbRecord.start_at}+${dbRecord.end_at}+${dbRecord.ext}+${paths}`;
  }
}

export const exerciseService = ExerciseService.getInstance();
