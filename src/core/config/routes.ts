/**
 * 路由配置和注册
 * 统一管理所有路由的注册和配置
 */
import type { Application } from 'express';
import { env } from '@/core/config/env';
import apiRoutes, { systemRoutes } from '@/api/routes';
import { getAppPinoLogger } from '@/core/logger/pino';

const logger = getAppPinoLogger();

/**
 * API路由配置
 */
export const ROUTE_CONFIG = {
  // API前缀配置
  API_PREFIX: `/${env.API_PREFIX}`,

  // 静态资源路由（如需要）
  STATIC_ROUTES: {
    PUBLIC: '/public',
    UPLOADS: '/uploads',
  },
} as const;

/**
 * 设置应用路由
 */
export default function setupRoutes(app: Application): void {
  // 1. 注册系统路由（不带 API 前缀）
  registerSystemRoutes(app);

  // 2. 注册业务 API 路由（带 API 前缀）
  registerApiRoutes(app);

  // 3. 打印路由配置信息
  printRouteConfiguration();
}

/**
 * 注册系统路由
 * 这些路由不添加 /api 前缀，便于负载均衡器和监控系统访问
 */
function registerSystemRoutes(app: Application): void {
  Object.entries(systemRoutes).forEach(([name, { path, router, description }]) => {
    app.use(path, router);
    logger.debug({ name, path, description }, 'System route registered');
  });
}

/**
 * 注册业务 API 路由
 * 这些路由会自动添加 /api 前缀
 */
function registerApiRoutes(app: Application): void {
  app.use(ROUTE_CONFIG.API_PREFIX, apiRoutes);
  logger.debug({ prefix: ROUTE_CONFIG.API_PREFIX }, 'API routes registered');
}

/**
 * 打印路由配置信息
 */
function printRouteConfiguration(): void {
  console.log('\n📋 Route Configuration:');
  console.log('='.repeat(60));

  // 打印系统路由
  console.log('\n🔧 System Routes (no prefix):');
  Object.entries(systemRoutes).forEach(([name, { path, description }]) => {
    console.log(`  ${path.padEnd(30)} - ${description || name}`);
  });

  // 打印 API 路由
  console.log(`\n🌐 API Routes (prefix: ${ROUTE_CONFIG.API_PREFIX}):`);
  console.log(`  ${ROUTE_CONFIG.API_PREFIX}/auth              - 认证相关接口`);
  // 这里可以添加更多路由说明

  console.log(`\n${'='.repeat(60)}\n`);
}

/**
 * 获取完整的API路径
 */
export function getFullApiPath(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${ROUTE_CONFIG.API_PREFIX}${normalizedPath}`;
}

/**
 * 获取系统路由路径
 */
export function getSystemRoutePath(routeName: keyof typeof systemRoutes): string {
  return systemRoutes[routeName].path;
}
