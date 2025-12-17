/**
 * 路由配置和注册
 * 使用装饰器系统统一管理所有路由的注册和配置
 */
import { env } from '@/core/config/env';
import { registerRoutes } from '@/core/router/registry';

import type { Application } from 'express';

export const API_PREFIX = `/${env.API_PREFIX}`;

/**
 * 设置应用路由
 * 使用装饰器系统自动注册所有控制器
 */
export default function setupRoutes(app: Application): void {
  // 导入所有控制器（触发装饰器注册）
  import('@/controllers');

  // 注册所有装饰器标记的路由
  registerRoutes(app);
}

/**
 * 获取完整的 API 路径
 */
export function getFullApiPath(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_PREFIX}${normalizedPath}`;
}
