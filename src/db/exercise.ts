import * as SQLite from 'expo-sqlite';
import {AppDBBasePath} from "@/constants";

export class ExerciseDatabase {
  private db: SQLite.SQLiteDatabase | null = null;

  async init() {
    try {
      console.log('开始初始化数据库...');
      this.db = await SQLite.openDatabaseAsync( 'exercise' + (__DEV__ ? '_debug' : ''), undefined, AppDBBasePath);
      console.log('数据库打开成功');

      if (!this.db) {
        throw new Error('数据库对象为 null');
      }

      //await this.enableWal();
      await this.createTables();
      console.log('表创建成功');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      this.db = null;
      throw error;
    }
  }

  private async enableWal() {
    if (!this.db) return;
    try {
      await this.db.execAsync('PRAGMA journal_mode=WAL;');
      console.log('Journal mode set to WAL');
    } catch (error) {
      console.error('Failed to enable WAL mode:', error);
    }
  }

  private async createTables() {
    if (!this.db) return;

    // 创建 exercise 表
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS exercise (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type INTEGER,
        start_at TEXT,
        end_at TEXT,
        status TEXT,
        ext TEXT,
        tsr INTEGER DEFAULT 0
      );
    `);

    // 创建 exercise_run_paths 表
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS exercise_run_paths (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        record_id TEXT,
        paths TEXT
      );
    `);

    // 创建 run_records 表
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS run_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        start_at TEXT,
        end_at TEXT,
        avg_pace TEXT,
        distance TEXT,
        duration TEXT,
        paths TEXT
      );
    `);

    // 创建 tsr 表
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS tsr (
        type TEXT,
        third_id TEXT,
        tsr TEXT,
        PRIMARY KEY (type, third_id)
      );
    `);
  }

  async saveRecord(record: any): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.runAsync(
      'INSERT INTO exercise (type, start_at, end_at, ext, status, tsr) VALUES (?, ?, ?, ?, ?, ?)',
      [record.type, record.start_at, record.end_at, record.ext, record.status, record.tsr === '' ? 0 : 1]
    );

    const insertId = result.lastInsertRowId;

    // 如果是跑步记录且有路径，保存路径
    if (record.type === 2 && record.paths !== '') {
      await this.db.runAsync(
        'INSERT INTO exercise_run_paths (record_id, paths) VALUES (?, ?)',
        [insertId, record.paths]
      );
    }

    // 保存 TSR 到单独的表
    if (record.tsr !== '') {
      await this.db.runAsync(
        'INSERT INTO tsr (type, third_id, tsr) VALUES (?, ?, ?)',
        [record.tsrType, insertId, record.tsr]
      );
    }

    return insertId as number;
  }

  async updateRecord(id: number, record: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      'UPDATE exercise SET start_at = ?, end_at = ?, ext = ?, status = ?, tsr = ? WHERE id = ?',
      [record.start_at, record.end_at, record.ext, record.status, record.tsr === '' ? 0 : 1, id]
    );

    // 更新 TSR
    if (record.tsr === '') {
      // 删除 TSR
      await this.db.runAsync(
        'DELETE FROM tsr WHERE type = ? AND third_id = ?',
        [record.tsrType, id]
      );
    } else {
      // 检查是否存在
      const existing = await this.db.getAllAsync(
        'SELECT type, third_id FROM tsr WHERE type = ? AND third_id = ?',
        [record.tsrType, id]
      );

      if (existing.length > 0) {
        // 更新
        await this.db.runAsync(
          'UPDATE tsr SET tsr = ? WHERE type = ? AND third_id = ?',
          [record.tsr, record.tsrType, id]
        );
      } else {
        // 插入
        await this.db.runAsync(
          'INSERT INTO tsr (type, third_id, tsr) VALUES (?, ?, ?)',
          [record.tsrType, id, record.tsr]
        );
      }
    }
  }

  async deleteRecord(record: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync('DELETE FROM exercise WHERE id = ?', [record.id]);
    await this.db.runAsync('DELETE FROM exercise_run_paths WHERE record_id = ?', [record.id]);
  }

  async getRecordsByType(
    types: string[],
    page: number = 1,
    perPage: number = 10,
    startTime?: string,
    endTime?: string,
    sortOrder: string = 'desc'
  ): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');

    // 规范化排序参数，只接受 'asc' 或 'desc'
    const normalizedSortOrder = sortOrder.toLowerCase();
    if (!['asc', 'desc'].includes(normalizedSortOrder)) {
      sortOrder = 'desc';
    } else {
      sortOrder = normalizedSortOrder;
    }

    const params: any[] = [];
    const whereClauses: string[] = [];

    // types
    if (types.length > 0) {
      const placeholders = types.map(() => '?').join(',');
      whereClauses.push(`type IN (${placeholders})`);
      params.push(...types);
    }

    // startTime / endTime
    if (startTime) {
      whereClauses.push('start_at >= ?');
      params.push(startTime);
    }
    if (endTime) {
      whereClauses.push('start_at <= ?');
      params.push(endTime);
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // 使用小写的排序参数（SQLite 不区分大小写，但保持一致性）
    let query = `SELECT * FROM exercise ${whereSQL} ORDER BY start_at ${sortOrder}`;

    if (page !== -1) {
      const offset = (page - 1) * perPage;
      query += ' LIMIT ? OFFSET ?';
      params.push(perPage, offset);
    }

    const result = await this.db.getAllAsync(query, params);
    return result as any[];
  }

  async getRecordById(id: number): Promise<any> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getAllAsync('SELECT * FROM exercise WHERE id = ?', [id]);
    let record = result.length > 0 ? result[0] : null;

    if (record && record.type === 2) {
      const pathResult = await this.db.getAllAsync(
        'SELECT * FROM exercise_run_paths WHERE record_id = ? LIMIT 1',
        [record.id]
      );
      record.paths = pathResult.length > 0 ? pathResult[0].paths : '';
    }

    return record;
  }

  async getTSR(type: string, id: string): Promise<any> {
    if (!this.db) throw new Error('Database not initialized');
    const result = await this.db.getAllAsync(
      'SELECT * FROM tsr WHERE type = ? AND third_id = ?',
      [type, id]
    );
    return result.length > 0 ? result[0] : null;
  }

  async saveRunRecord(record: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      'INSERT INTO run_records (start_at, end_at, avg_pace, distance, duration, paths) VALUES (?, ?, ?, ?, ?, ?)',
      [record.start_at, record.end_at, record.avg_pace, record.distance, record.duration, record.paths]
    );
  }
}

export const exerciseDB = new ExerciseDatabase();
