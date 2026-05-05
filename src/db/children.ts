import * as SQLite from 'expo-sqlite';
import {AppDBBasePath} from "@/constants";

export class ChildrenDatabase {
  private db: SQLite.SQLiteDatabase | null = null;

  async init() {
    try {
      console.log('开始初始化 children 数据库...');
      this.db = await SQLite.openDatabaseAsync('children' + (__DEV__ ? '_debug' : ''), undefined, AppDBBasePath );
      console.log('children 数据库打开成功');

      if (!this.db) {
        throw new Error('数据库对象为 null');
      }

      await this.createTables();
      console.log('children 表创建成功');
    } catch (error) {
      console.error('Failed to initialize children database:', error);
      this.db = null;
      throw error;
    }
  }

  private async createTables() {
    if (!this.db) return;

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        child TEXT NOT NULL,
        event_type TEXT NOT NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME NOT NULL,
        duration INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS event_meta (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL,
        meta_key TEXT NOT NULL,
        meta_value TEXT NOT NULL,
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
      );
    `);
  }

  async saveEvent(event: any): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const now = new Date().toISOString();

    await this.db.runAsync(
      'INSERT INTO events (id, child, event_type, start_time, end_time, duration, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, event.child, event.event_type, event.start_time, event.end_time, event.duration, now, now]
    );

    // 保存元数据
    if (event.meta && Object.keys(event.meta).length > 0) {
      for (const [key, value] of Object.entries(event.meta)) {
        const metaId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        await this.db.runAsync(
          'INSERT INTO event_meta (id, event_id, meta_key, meta_value) VALUES (?, ?, ?, ?)',
          [metaId, id, key, String(value)]
        );
      }
    }

    return id;
  }

  async updateEvent(id: string, event: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const now = new Date().toISOString();

    await this.db.runAsync(
      'UPDATE events SET child = ?, event_type = ?, start_time = ?, end_time = ?, duration = ?, updated_at = ? WHERE id = ?',
      [event.child, event.event_type, event.start_time, event.end_time, event.duration, now, id]
    );

    // 更新元数据：先删除旧的，再插入新的
    if (event.meta !== undefined) {
      await this.db.runAsync('DELETE FROM event_meta WHERE event_id = ?', [id]);

      if (event.meta && Object.keys(event.meta).length > 0) {
        for (const [key, value] of Object.entries(event.meta)) {
          const metaId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
          await this.db.runAsync(
            'INSERT INTO event_meta (id, event_id, meta_key, meta_value) VALUES (?, ?, ?, ?)',
            [metaId, id, key, String(value)]
          );
        }
      }
    }
  }

  async deleteEvent(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync('DELETE FROM events WHERE id = ?', [id]);
    await this.db.runAsync('DELETE FROM event_meta WHERE event_id = ?', [id]);
  }

  async getEventsByFilter(
    children: string[],
    eventTypes: string[],
    startTime?: string,
    endTime?: string,
    orderBy: string = 'created_at',
    orderSort: string = 'DESC',
    limit: number = -1
  ): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');

    if (!['ASC', 'DESC'].includes(orderSort.toUpperCase())) {
      orderSort = 'DESC';
    }

    const params: any[] = [];
    const whereClauses: string[] = [];

    // children filter
    if (children && children.length > 0) {
      const placeholders = children.map(() => '?').join(',');
      whereClauses.push(`child IN (${placeholders})`);
      params.push(...children);
    }

    // eventTypes filter
    if (eventTypes && eventTypes.length > 0) {
      const placeholders = eventTypes.map(() => '?').join(',');
      whereClauses.push(`event_type IN (${placeholders})`);
      params.push(...eventTypes);
    }

    // time range filter
    if (startTime) {
      whereClauses.push('start_time >= ?');
      params.push(startTime);
    }
    if (endTime) {
      whereClauses.push('start_time <= ?');
      params.push(endTime);
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    let query = `SELECT * FROM events ${whereSQL} ORDER BY ${orderBy} ${orderSort.toUpperCase()}`;

    if (limit > 0) {
      query += ' LIMIT ?';
      params.push(limit);
    }

    const events = await this.db.getAllAsync(query, params) as any[];

    // 获取每个事件的元数据
    const result = await Promise.all(events.map(async (event) => {
      const meta = await this.getEventMeta(event.id);
      return {
        ...event,
        ...meta,
      };
    }));

    return result;
  }

  async getEventById(id: string): Promise<any> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getAllAsync('SELECT * FROM events WHERE id = ?', [id]);
    if (result.length === 0) return null;

    const event = result[0];
    const meta = await this.getEventMeta(id);

    return {
      ...event,
      ...meta,
    };
  }

  private async getEventMeta(eventId: string): Promise<any> {
    if (!this.db) throw new Error('Database not initialized');

    const metaRows = await this.db.getAllAsync(
      'SELECT meta_key, meta_value FROM event_meta WHERE event_id = ?',
      [eventId]
    );

    const meta: any = {};
    metaRows.forEach((row: any) => {
      meta[row.meta_key] = row.meta_value;
    });

    return meta;
  }
}

export const childrenDB = new ChildrenDatabase();
