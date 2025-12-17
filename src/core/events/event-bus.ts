/**
 * 事件总线
 * 基于 EventEmitter 的类型安全事件系统
 */
import { EventEmitter } from 'events';

import { env } from '@/core/config/env';
import { getAppPinoLogger } from '@/core/logger/pino';

import type { EventMap, EventName } from './event-types';

const logger = getAppPinoLogger();

export class TypedEventBus extends EventEmitter {
  private static instance: TypedEventBus;

  private constructor() {
    super();
    this.setMaxListeners(100); // 增加最大监听器数量
  }

  /**
   * 获取单例实例
   */
  static getInstance(): TypedEventBus {
    if (!TypedEventBus.instance) {
      TypedEventBus.instance = new TypedEventBus();
    }
    return TypedEventBus.instance;
  }

  /**
   * 发布事件（类型安全）
   */
  publish<K extends EventName>(event: K, data: EventMap[K]): void {
    if (env.isDevelopment) {
      logger.debug({ event, data }, 'Event published');
    }
    this.emit(event, data);
  }

  /**
   * 订阅事件（类型安全）
   */
  subscribe<K extends EventName>(event: K, handler: (data: EventMap[K]) => void | Promise<void>): void {
    this.on(event, async (data: EventMap[K]) => {
      try {
        await handler(data);
      } catch (error) {
        logger.error({ err: error, event }, 'Event handler error');
      }
    });
    if (env.isDevelopment) {
      logger.debug({ event }, 'Event subscribed');
    }
  }

  /**
   * 订阅一次性事件（类型安全）
   */
  subscribeOnce<K extends EventName>(event: K, handler: (data: EventMap[K]) => void | Promise<void>): void {
    this.once(event, async (data: EventMap[K]) => {
      try {
        await handler(data);
      } catch (error) {
        logger.error({ err: error, event }, 'Event handler error');
      }
    });
  }

  /**
   * 取消订阅
   */
  unsubscribe<K extends EventName>(event: K, handler: (data: EventMap[K]) => void): void {
    this.off(event, handler);
    if (env.isDevelopment) {
      logger.debug({ event }, 'Event unsubscribed');
    }
  }

  /**
   * 取消所有订阅
   */
  unsubscribeAll(event?: EventName): void {
    if (event) {
      this.removeAllListeners(event);
    } else {
      this.removeAllListeners();
    }
  }
}

// 导出单例
export const eventBus = TypedEventBus.getInstance();

// 向后兼容的导出
export { TypedEventBus as EventBus };
