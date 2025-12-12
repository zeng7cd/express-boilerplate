/**
 * 事件总线
 * 基于 EventEmitter 的简单事件系统
 */
import { EventEmitter } from 'events';
import { getAppPinoLogger } from '@/core/logger/pino';

const logger = getAppPinoLogger();

export class EventBus extends EventEmitter {
  private static instance: EventBus;

  private constructor() {
    super();
    this.setMaxListeners(100); // 增加最大监听器数量
  }

  /**
   * 获取单例实例
   */
  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /**
   * 发布事件
   */
  publish<T = any>(eventName: string, data: T): void {
    logger.debug({ eventName, data }, 'Event published');
    this.emit(eventName, data);
  }

  /**
   * 订阅事件
   */
  subscribe<T = any>(eventName: string, handler: (data: T) => void | Promise<void>): void {
    this.on(eventName, async (data: T) => {
      try {
        await handler(data);
      } catch (error) {
        logger.error({ err: error, eventName }, 'Event handler error');
      }
    });
    logger.debug({ eventName }, 'Event subscribed');
  }

  /**
   * 订阅一次性事件
   */
  subscribeOnce<T = any>(eventName: string, handler: (data: T) => void | Promise<void>): void {
    this.once(eventName, async (data: T) => {
      try {
        await handler(data);
      } catch (error) {
        logger.error({ err: error, eventName }, 'Event handler error');
      }
    });
  }

  /**
   * 取消订阅
   */
  unsubscribe(eventName: string, handler: (...args: any[]) => void): void {
    this.off(eventName, handler);
    logger.debug({ eventName }, 'Event unsubscribed');
  }

  /**
   * 取消所有订阅
   */
  unsubscribeAll(eventName?: string): void {
    if (eventName) {
      this.removeAllListeners(eventName);
    } else {
      this.removeAllListeners();
    }
  }
}

// 导出单例
export const eventBus = EventBus.getInstance();
