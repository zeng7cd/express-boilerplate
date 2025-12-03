import type { Application } from 'express';
import { env } from '@/core/config/env';
import { routeRegistry } from '@/shared/utils/routeRegistry';
import apiRoutes from '@/api/routes';

/**
 * API路由配置
 * 统一管理所有系统级路由配置
 */
export const ROUTE_CONFIG = {
  // API前缀配置
  API_PREFIX: `/${env.API_PREFIX}`,

  // 系统级路由配置
  SYSTEM_ROUTES: {
    HEALTH_CHECK: '/health-check',
  },

  // 静态资源路由
  STATIC_ROUTES: {
    PUBLIC: '/public',
    UPLOADS: '/uploads',
  },
} as const;

/**
 * 设置应用路由
 */
export default function setupRoutes(app: Application) {
  // 注册自动发现的API路由
  setupApiRoutes(app);
  // 打印路由配置信息
  printRouteConfiguration();
}

/**
 * 设置API路由
 */
function setupApiRoutes(app: Application): void {
  // 使用新的API路由
  app.use(ROUTE_CONFIG.API_PREFIX, apiRoutes);

  // 使用路由注册器的主路由器，包含所有自动注册的API路由
  app.use(ROUTE_CONFIG.API_PREFIX, routeRegistry.getRouter());
}

/**
 * 打印路由配置信息
 */
function printRouteConfiguration(): void {
  // 打印具体的API路由信息
  routeRegistry.printRoutes();
}

/**
 * 获取完整的API路径
 */
export function getFullApiPath(path: string): string {
  return `${ROUTE_CONFIG.API_PREFIX}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * 获取系统路由路径
 */
export function getSystemRoutePath(routeKey: keyof typeof ROUTE_CONFIG.SYSTEM_ROUTES): string {
  return ROUTE_CONFIG.SYSTEM_ROUTES[routeKey];
}
