/**
 * 路由装饰器类型定义
 */
import type { RequestHandler } from 'express';

/**
 * HTTP 方法类型
 */
export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'options' | 'head';

/**
 * 路由元数据
 */
export interface RouteMetadata {
  method: HttpMethod;
  path: string;
  middlewares: RequestHandler[];
  handlerName: string;
  description?: string;
}

/**
 * 控制器元数据
 */
export interface ControllerMetadata {
  prefix: string;
  middlewares: RequestHandler[];
  routes: RouteMetadata[];
  description?: string;
  isSystemRoute?: boolean; // 是否为系统路由（不添加 API 前缀）
}

/**
 * 控制器类构造函数
 */

export interface ControllerConstructor {
  new (...args: any[]): any;
}

/**
 * 元数据键
 */
export const METADATA_KEYS = {
  CONTROLLER: Symbol('controller'),
  ROUTES: Symbol('routes'),
  MIDDLEWARES: Symbol('middlewares'),
} as const;
