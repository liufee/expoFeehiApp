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

      await this.createTables();
      console.log('表创建成功');

      //await this.migrateTables();
      console.log('数据库迁移完成');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      this.db = null; // 确保 db 为 null，避免后续使用
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
        paths TEXT DEFAULT '',
        tsr TEXT DEFAULT ''
      );
    `);

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS tsr (
        type TEXT,
        third_id TEXT,
        tsr TEXT,
        PRIMARY KEY (type, third_id)
      );
    `);
  }

  private async migrateTables() {
    if (!this.db) return;

    try {
      // 检查 records 表是否有 tsr 字段
      const tableInfo = await this.db.getAllAsync('PRAGMA table_info(records)');
      const hasTsrColumn = (tableInfo as any[]).some((col: any) => col.name === 'tsr');

      if (!hasTsrColumn) {
        console.log('Adding tsr column to records table...');
        await this.db.execAsync('ALTER TABLE records ADD COLUMN tsr TEXT DEFAULT ""');
        console.log('tsr column added successfully');
      }
    } catch (error) {
      console.error('Migration error:', error);
      // 如果字段已存在，ALTER TABLE 会失败，这是正常的
    }
  }

  async saveRecord(record: any): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);

    await this.db.runAsync(
      'INSERT INTO records (id, type, start_at, end_at, status, ext, paths, tsr) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, record.type, record.start_at, record.end_at, record.status, record.ext, record.paths, record.tsr ? 1 : 0]
    );

    // 保存 TSR 到单独的表
    if (record.tsr && record.tsr !== '') {
      await this.db.runAsync(
        'INSERT INTO tsr (type, third_id, tsr) VALUES (?, ?, ?)',
        [record.tsrType, id, record.tsr]
      );
    }

    return id;
  }

  async updateRecord(id: string, record: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      'UPDATE records SET start_at = ?, end_at = ?, status = ?, ext = ?, tsr = ? WHERE id = ?',
      [record.start_at, record.end_at, record.status, record.ext, record.tsr || '', id]
    );

    // 更新 TSR
    if (record.tsr !== undefined) {
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
  }

  async deleteRecord(id: string, tsrType: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync('DELETE FROM records WHERE id = ?', [id]);
    await this.db.runAsync('DELETE FROM tsr WHERE type = ? AND third_id = ?', [tsrType, id]);
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

    if (!['asc', 'desc'].includes(sortOrder.toLowerCase())) {
      sortOrder = 'desc';
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

    let query = `SELECT * FROM records ${whereSQL} ORDER BY start_at ${sortOrder.toUpperCase()}`;

    if (page !== -1 && perPage > 0) {
      const offset = (page - 1) * perPage;
      query += ' LIMIT ? OFFSET ?';
      params.push(perPage, offset);
    }

    const result = await this.db.getAllAsync(query, params);
    return result as any[];
  }

  async getRecordById(id: string): Promise<any> {
    if (!this.db) throw new Error('Database not initialized');
    const result = await this.db.getAllAsync('SELECT * FROM records WHERE id = ?', [id]);
    return result.length > 0 ? result[0] : null;
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
    // 如果需要单独的 run_records 表，可以在这里实现
    // 当前项目中跑步记录存储在 records 表中
  }
}

export const exerciseDB = new ExerciseDatabase();
