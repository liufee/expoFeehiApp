import { childrenDB } from '@/src/db/children';
import { Event, EventType } from './model';

export class ChildrenService {
  private static instance: ChildrenService;
  private dbInitialized = false;

  private constructor() {}

  static getInstance(): ChildrenService {
    if (!ChildrenService.instance) {
      ChildrenService.instance = new ChildrenService();
    }
    return ChildrenService.instance;
  }

  async initDB(): Promise<void> {
    if (!this.dbInitialized) {
      try {
        console.log('开始初始化 children 数据库服务...');
        await childrenDB.init();
        this.dbInitialized = true;
        console.log('children 数据库服务初始化成功');
      } catch (error) {
        console.error('children 数据库服务初始化失败:', error);
        this.dbInitialized = false;
        throw error;
      }
    }
  }

  async createEvent(event: Event): Promise<[boolean, string]> {
    try {
      console.log('开始创建事件...', event.eventType);
      await this.initDB();

      // 计算持续时间（分钟）
      const startTime = new Date(event.startTime);
      const endTime = new Date(event.endTime || event.startTime);
      const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

      // 构建数据库记录对象
      const dbEvent: any = {
        child: event.child,
        event_type: event.eventType,
        start_time: event.startTime,
        end_time: event.endTime || event.startTime,
        duration: duration,
        meta: {},
      };

      // 根据事件类型添加元数据
      switch (event.eventType) {
        case EventType.Eat:
          dbEvent.meta.amount = (event as any).amount;
          break;
        case EventType.Poop:
          dbEvent.meta.type = (event as any).type;
          dbEvent.meta.color = (event as any).color;
          break;
        case EventType.Pee:
          dbEvent.meta.level = (event as any).level;
          break;
        case EventType.Cry:
          dbEvent.meta.level = (event as any).level;
          break;
      }

      console.log('构建数据库事件对象:', dbEvent);

      // 保存到数据库
      await childrenDB.saveEvent(dbEvent);
      console.log('事件保存成功');

      return [true, ''];
    } catch (error) {
      console.error('Failed to create event:', error);
      return [false, error instanceof Error ? error.message : '创建事件失败'];
    }
  }

  async getEvents(
    children: string[],
    eventTypes: EventType[],
    startAt: string,
    endAt: string,
    orderBy: string = 'created_at',
    orderSort: string = 'DESC',
    limit: number = -1
  ): Promise<[boolean, Event[], string]> {
    let events: Event[] = [];
    try {
      await this.initDB();
      
      const eventTypeStrings = eventTypes.map(t => t.toString());
      const rows = await childrenDB.getEventsByFilter(
        children,
        eventTypeStrings,
        startAt,
        endAt,
        orderBy,
        orderSort,
        limit
      );

      for (const row of rows) {
        const event = this.convertToEvent(row);
        events.push(event);
      }

      return [true, events, ''];
    } catch (error) {
      console.error('Failed to get events:', error);
      return [false, events, error instanceof Error ? error.message : '获取事件失败'];
    }
  }

  async deleteEvent(id: string): Promise<[boolean, string]> {
    try {
      await this.initDB();
      await childrenDB.deleteEvent(id);
      return [true, ''];
    } catch (error) {
      console.error('Failed to delete event:', error);
      return [false, error instanceof Error ? error.message : '删除事件失败'];
    }
  }

  private convertToEvent(row: any): Event {
    const baseEvent: any = {
      id: row.id,
      child: row.child,
      eventType: row.event_type,
      startTime: row.start_time,
      endTime: row.end_time,
      duration: row.duration,
    };

    // 根据事件类型添加特定字段
    switch (row.event_type) {
      case EventType.Eat:
        baseEvent.amount = parseFloat(row.amount) || 0;
        break;
      case EventType.Poop:
        baseEvent.type = row.type || '';
        baseEvent.color = row.color || '';
        break;
      case EventType.Pee:
        baseEvent.level = row.level || '';
        break;
      case EventType.Cry:
        baseEvent.level = row.level || '';
        break;
    }

    return baseEvent as Event;
  }
}

export const childrenService = ChildrenService.getInstance();
