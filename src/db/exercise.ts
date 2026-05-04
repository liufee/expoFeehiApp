import * as SQLite from 'expo-sqlite';
import { Record, RecordType } from './model';

export class ExerciseDatabase {
  private db: SQLite.SQLiteDatabase | null = null;

  async init() {
    try {
      this.db = await SQLite.openDatabaseAsync('exercise.db');
      await this.createTables();
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  private async createTables() {
    if (!this.db) return;

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS records (
        id TEXT PRIMARY KEY,
        type INTEGER NOT NULL,
        start_at TEXT NOT NULL,
        end_at TEXT NOT NULL,
        status INTEGER NOT NULL,
        ext TEXT DEFAULT '',
        tsr TEXT DEFAULT '',
        tsr_type TEXT DEFAULT 'exercise',
        paths TEXT DEFAULT ''
      );
    `);
  }

  async saveRecord(record: Omit<Record, 'id'>): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    
    let ext = '';
    if (record.type === RecordType.RecordTypeSitUpPushUp) {
      ext = `${record.sitUpPushUp.pushUp},${record.sitUpPushUp.sitUp},${record.sitUpPushUp.curlUp},${record.sitUpPushUp.legsUpTheWallPose}`;
    } else if (record.type === RecordType.RecordTypeRun) {
      ext = `${record.run.avgPace},${record.run.distance},${record.run.runDuration},${record.run.runningWithoutPosition}`;
    }

    let paths = '';
    if (record.type === RecordType.RecordTypeRun && record.run.paths) {
      paths = record.run.paths.map(p => 
        `${p.latitude},${p.longitude},${new Date(p.time).toISOString().replace('T', ' ').split('.')[0]}`
      ).join(';');
    }

    await this.db.runAsync(
      'INSERT INTO records (id, type, start_at, end_at, status, ext, tsr, tsr_type, paths) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, record.type, record.startAt, record.endAt, record.status, ext, record.tsr || '', 'exercise', paths]
    );

    return id;
  }

  async updateRecord(id: string, record: Partial<Record>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    let ext = '';
    if (record.sitUpPushUp) {
      ext = `${record.sitUpPushUp.pushUp},${record.sitUpPushUp.sitUp},${record.sitUpPushUp.curlUp},${record.sitUpPushUp.legsUpTheWallPose}`;
    } else if (record.run) {
      ext = `${record.run.avgPace},${record.run.distance},${record.run.runDuration},${record.run.runningWithoutPosition}`;
    }

    const startAt = record.startAt || '';
    const endAt = record.endAt || '';
    const status = record.status !== undefined ? record.status : 0;

    await this.db.runAsync(
      'UPDATE records SET start_at = ?, end_at = ?, status = ?, ext = ? WHERE id = ?',
      [startAt, endAt, status, ext, id]
    );
  }

  async deleteRecord(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync('DELETE FROM records WHERE id = ?', [id]);
  }

  async getRecordsByTypes(types: RecordType[], limit: number = -1): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');

    const typeStr = types.join(',');
    let query = `SELECT * FROM records WHERE type IN (${typeStr}) ORDER BY start_at DESC`;
    
    if (limit > 0) {
      query += ` LIMIT ${limit}`;
    }

    const result = await this.db.getAllAsync(query);
    return result;
  }

  async getRecordsByPage(
    types: RecordType[],
    page: number,
    perPage: number,
    startTime?: string,
    endTime?: string,
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');

    const typeStr = types.join(',');
    let query = `SELECT * FROM records WHERE type IN (${typeStr})`;
    const params: any[] = [];

    if (startTime) {
      query += ' AND start_at >= ?';
      params.push(startTime);
    }

    if (endTime) {
      query += ' AND start_at <= ?';
      params.push(endTime);
    }

    query += ` ORDER BY start_at ${sortOrder.toUpperCase()}`;

    if (perPage > 0) {
      query += ' LIMIT ? OFFSET ?';
      params.push(perPage);
      params.push((page - 1) * perPage);
    }

    const result = await this.db.getAllAsync(query, params);
    return result;
  }

  async getRecordById(id: string): Promise<any> {
    if (!this.db) throw new Error('Database not initialized');
    const result = await this.db.getAllAsync('SELECT * FROM records WHERE id = ?', [id]);
    return result.length > 0 ? result[0] : null;
  }

  private convertToRecord(row: any): Record {
    const record: Record = {
      id: row.id,
      type: row.type,
      startAt: row.start_at,
      endAt: row.end_at,
      status: row.status,
      abdominal: {} as any,
      run: {} as any,
      sitUpPushUp: {} as any,
      tsr: row.tsr || 0,
      tsrVerified: 1,
    };

    if (row.type === RecordType.RecordTypeAbdominal) {
      record.abdominal = {};
    } else if (row.type === RecordType.RecordTypeSitUpPushUp) {
      const ext = row.ext.split(',');
      record.sitUpPushUp = {
        pushUp: parseInt(ext[0]) || 0,
        sitUp: parseInt(ext[1]) || 0,
        curlUp: parseInt(ext[2]) || 0,
        legsUpTheWallPose: parseInt(ext[3]) || 0,
      };
    } else if (row.type === RecordType.RecordTypeRun) {
      const ext = row.ext.split(',');
      let paths: any[] = [];
      
      if (row.paths) {
        const lines = row.paths.split(';');
        paths = lines.map((line: string) => {
          const parts = line.split(',');
          return {
            latitude: parseFloat(parts[0]),
            longitude: parseFloat(parts[1]),
            time: new Date(parts[2]).getTime(),
          };
        });
      }

      record.run = {
        avgPace: parseFloat(ext[0]) || 0,
        distance: parseFloat(ext[1]) || 0,
        runDuration: ext[2] || '',
        runningWithoutPosition: parseInt(ext[3]) || 0,
        paths: paths,
      };
    }

    return record;
  }

  async getDailyExercises(
    types: RecordType[],
    startTime: string,
    endTime: string,
    sortOrder: 'asc' | 'desc' = 'asc'
  ) {
    const rows = await this.getRecordsByPage(types, 1, -1, startTime, endTime, sortOrder);
    const records = rows.map(row => this.convertToRecord(row));

    // Group by date
    const groupedData: any = {};
    records.forEach((record: Record) => {
      const date = record.startAt.split(' ')[0];
      if (!groupedData[date]) {
        groupedData[date] = [];
      }
      groupedData[date].push(record);
    });

    const dailyExercises = Object.keys(groupedData).map(date => {
      const exercises = groupedData[date];
      const completedTypes = new Set(exercises.map((r: Record) => r.type)).size;
      return {
        date,
        exercises,
        completedTypes,
        allCompleted: completedTypes === 3,
      };
    });

    return dailyExercises;
  }
}

export const exerciseDB = new ExerciseDatabase();
