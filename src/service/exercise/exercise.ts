import { exerciseDB } from '@/src/db/exercise';
import { Record, RecordType, Status, DailyExercise, Run, Path } from './model';
import {generateTSR} from '@/src/util/tsr';
import {Setting} from '../setting/types';

export class ExerciseService {
  private static instance: ExerciseService;
  private dbInitialized = false;
  private setting: Setting;

  private constructor() {}

  static getInstance(): ExerciseService {
    if (!ExerciseService.instance) {
      ExerciseService.instance = new ExerciseService();
    }
    return ExerciseService.instance;
  }

  public setSetting(setting: Setting): void {
    this.setting = setting;
  }

  async initDB(): Promise<void> {
    if (!this.dbInitialized) {
      try {
        console.log('开始初始化数据库服务...');
        await exerciseDB.init();
        this.dbInitialized = true;
        console.log('数据库服务初始化成功');
      } catch (error) {
        console.error('数据库服务初始化失败:', error);
        this.dbInitialized = false; // 确保标记为未初始化
        throw error;
      }
    }
  }

  async saveRecord(record: Record): Promise<[boolean, string]> {
    try {
      console.log('开始保存记录...', record.type);

      console.log('数据库初始化完成');

      // 构建数据库记录对象
      const dbRecord: any = {
        type: record.type,
        start_at: record.startAt,
        end_at: record.endAt,
        status: record.status,
        ext: this.assembleExt(record),
        tsr: '',
        tsrType: 'exercise',
        paths: '',
      };

      console.log('构建数据库记录对象:', dbRecord);

      // 如果是跑步记录，处理路径数据
      if (record.type === RecordType.RecordTypeRun) {
        let pathStr = '';
        for (let i in record.run.paths) {
          const path = record.run.paths[i];
          const timeStr = new Date(path.time).toISOString().replace('T', ' ').split('.')[0];
          pathStr += `${path.latitude},${path.longitude},${timeStr};`;
        }
        if (pathStr.endsWith(';')) {
          pathStr = pathStr.slice(0, -1);
        }
        dbRecord.paths = pathStr;
      }

      // 生成 TSR(如果启用)
      if (this.setting.exercise.enableTSR) {
        console.log('开始生成 TSR...');
        const originStr = this.assembleStrToCreateTSRByRecord(dbRecord);
        const [result, info] = await generateTSR(originStr);
        if (!result) {
          console.error('TSR 生成失败:', info);
          return [false, '创建tsr失败:' + info];
        }
        dbRecord.tsr = info;
        console.log('TSR 生成成功');
      }

      // 保存记录到数据库
      console.log('开始保存到数据库...');
      await exerciseDB.saveRecord(dbRecord);
      console.log('记录保存成功');

      return [true, ''];
    } catch (error) {
      console.error('Failed to save record:', error);
      console.error('错误详情:', JSON.stringify(error));
      return [false, error instanceof Error ? error.message : '保存记录失败'];
    }
  }

  async updateRecord(id: string, record: Record): Promise<[boolean, string]> {
    try {


      // 构建数据库记录对象
      const dbRecord: any = {
        type: record.type,
        start_at: record.startAt,
        end_at: record.endAt,
        status: record.status,
        ext: this.assembleExt(record),
        tsr: '',
        tsrType: 'exercise',
        paths: '',
      };

      // 生成 TSR(如果启用)
      if (this.setting.exercise.enableTSR) {
        const originStr = this.assembleStrToCreateTSRByRecord(dbRecord);
        const [result, info] = await generateTSR(originStr);
        if (!result) {
          return [false, '创建tsr失败:' + info];
        }
        dbRecord.tsr = info;
      }

      await exerciseDB.updateRecord(id, dbRecord);
      return [true, ''];
    } catch (error) {
      console.error('Failed to update record:', error);
      return [false, error instanceof Error ? error.message : '更新记录失败'];
    }
  }

  async deleteRecord(record: Record): Promise<[boolean, string]> {
    try {

      console.log(record)
      await exerciseDB.deleteRecord(record.id, 'exercise');
      return [true, ''];
    } catch (error) {
      console.error('Failed to delete record:', error);
      return [false, error instanceof Error ? error.message : '删除记录失败'];
    }
  }

  async getRecordsByType(type: RecordType): Promise<[boolean, Record[], string]> {
    return this.getRecordsByTypes([type]);
  }

  async getRecordsByTypes(types: RecordType[]): Promise<[boolean, Record[], string]> {
    let records: Record[] = [];
    try {

      const recordTypes = types.map(t => t.toString());
      const rows = await exerciseDB.getRecordsByType(recordTypes, -1);

      for (let i in rows) {
        const record = this.convertToRecord(rows[i]);
        records.push(record);
      }
      return [true, records, ''];
    } catch (error) {
      console.error('Failed to get records:', error);
      return [false, records, error instanceof Error ? error.message : '获取记录失败'];
    }
  }

  async getExercisesByPage(
    types: RecordType[],
    page: number,
    perPage: number,
    startTime?: string,
    endTime?: string,
    sortOrder: string = 'desc'
  ): Promise<[boolean, Record[], string]> {
    let records: Record[] = [];
    try {

      const recordTypes = types.map(t => t.toString());
      const rows = await exerciseDB.getRecordsByType(recordTypes, page, perPage, startTime, endTime, sortOrder);

      for (let i in rows) {
        const record = this.convertToRecord(rows[i]);
        records.push(record);
      }
      return [true, records, ''];
    } catch (error) {
      console.error('Failed to get exercises by page:', error);
      return [false, records, error instanceof Error ? error.message : '获取记录失败'];
    }
  }

  async getRecordsByPage(
    types: RecordType[],
    page: number,
    perPage: number,
    startTime?: string,
    endTime?: string,
    sortOrder: string = 'desc'
  ): Promise<[boolean, any[], string]> {
    try {

      const recordTypes = types.map(t => t.toString());
      const rows = await exerciseDB.getRecordsByType(recordTypes, page, perPage, startTime, endTime, sortOrder);
      return [true, rows, ''];
    } catch (error) {
      console.error('Failed to get records by page:', error);
      return [false, [], error instanceof Error ? error.message : '获取记录失败'];
    }
  }

  async getDailyExercises(
    types: RecordType[],
    startTime: string,
    endTime: string,
    sortOrder: string = 'asc'
  ): Promise<[boolean, DailyExercise[], string]> {
    const [success, items, err] = await this.getExercisesByPage(types, 1, -1, startTime, endTime, sortOrder);
    if (!success) {
      return [false, [], err];
    }

    // 按日期分组数据
    const groupedData = items.reduce((acc, record: Record) => {
      const date = record.startAt.split(' ')[0];
      if (!acc[date]) {
        acc[date] = [];
      }
      record.tsrVerified = 1; // js 版本跳过真实检验，需要进入检验详情页再检测
      acc[date].push(record);
      return acc;
    }, {} as Record<string, Record[]>);

    const dailyExercises: DailyExercise[] = Object.keys(groupedData).map(date => {
      const exercises = groupedData[date];
      const completedTypes = new Set(exercises.map(r => r.type)).size;
      return {
        date: date,
        exercises: exercises,
        completedTypes: completedTypes,
        allCompleted: completedTypes === 3,
      };
    });

    // 对每日锻炼记录按日期排序
    dailyExercises.sort((a, b) => {
      if (sortOrder.toLowerCase() === 'asc') {
        return a.date.localeCompare(b.date);
      } else {
        return b.date.localeCompare(a.date);
      }
    });

    return [true, dailyExercises, ''];
  }

  async getRecordById(id: string): Promise<[boolean, Record | null, string]> {
    let record: Record | null = null;
    try {

      const row = await exerciseDB.getRecordById(id);
      if (!row) {
        return [true, null, ''];
      }
      record = this.convertToRecord(row);
      return [true, record, ''];
    } catch (error) {
      console.error('Failed to get record:', error);
      return [false, record, error instanceof Error ? error.message : '获取记录失败'];
    }
  }

  async getTSR(id: string): Promise<[boolean, string, string]> {
    try {

      const row = await exerciseDB.getTSR('exercise', id);
      if (!row) {
        return [false, '', ''];
      }
      return [true, row.tsr, ''];
    } catch (error) {
      console.error('Failed to get TSR:', error);
      return [false, '', error instanceof Error ? error.message : '获取TSR失败'];
    }
  }

  async assembleStrToCreateTSR(id: string): Promise<[boolean, string]> {
    try {

      const row = await exerciseDB.getRecordById(id);
      if (!row) {
        return [false, '记录不存在'];
      }
      return [true, this.assembleStrToCreateTSRByRecord(row)];
    } catch (error) {
      console.error('Failed to assemble TSR string:', error);
      return [false, error instanceof Error ? error.message : '组装TSR字符串失败'];
    }
  }

  private convertToRecord(row: any): Record {
    let record: Record = {
      id: row.id,
      type: row.type,
      startAt: row.start_at,
      endAt: row.end_at,
      status: row.status,
      abdominal: null as any,
      run: null as any,
      sitUpPushUp: null as any,
      tsr: row.tsr || 0,
      tsrVerified: 0,
    };

    if (row.type === RecordType.RecordTypeAbdominal) {
      record.abdominal = {};
    } else if (row.type === RecordType.RecordTypeSitUpPushUp) {
      record.sitUpPushUp = this.convertSitUpPushUpToRecord(row);
    } else if (row.type === RecordType.RecordTypeRun) {
      record.run = this.convertRunToRecord(row);
    }

    return record;
  }

  private convertSitUpPushUpToRecord(row: any) {
    const temp = row.ext.split(',');
    return {
      sitUp: parseInt(temp[1]) || 0,
      pushUp: parseInt(temp[0]) || 0,
      curlUp: parseInt(temp[2]) || 0,
      legsUpTheWallPose: parseInt(temp[3]) || 0,
    };
  }

  private convertRunToRecord(row: any): Run {
    let paths: Path[] = [];
    const ext = row.ext.split(',');

    if (row.hasOwnProperty('paths') && row.paths !== '') {
      const lines = row.paths.split(';');
      for (let i in lines) {
        const line = lines[i];
        const one = line.split(',');
        paths.push({
          latitude: parseFloat(one[0]),
          longitude: parseFloat(one[1]),
          time: new Date(one[2]).getTime(),
        });
      }
    }

    return {
      avgPace: parseFloat(ext[0]) || 0,
      distance: parseFloat(ext[1]) || 0,
      runDuration: ext[2] || '',
      runningWithoutPosition: parseInt(ext[3]) || 0,
      paths: paths,
    };
  }

  private assembleExt(record: Record): string {
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

  private assembleStrToCreateTSRByRecord(dbRecord: any): string {
    let paths = '';
    if (dbRecord.paths !== undefined) {
      paths = dbRecord.paths;
    }
    return `${dbRecord.type}+${dbRecord.start_at}+${dbRecord.end_at}+${dbRecord.ext}+${paths}`;
  }
}

export const exerciseService = ExerciseService.getInstance();
