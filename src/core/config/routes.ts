/**
 * 路由配置和注册
 * 统一管理所有路由的注册和配置
 */
import type { Application } from 'express';
import { env } from '@/core/config/env';
import apiRoutes, { systemRoutes } from '@/routes';
import { getAppPinoLogger } from '@/core/logger/pino';

const logger = getAppPinoLogger();

export const API_PREFIX = `/${env.API_PREFIX}`;

/**
 * 设置应用路由
 */
export default function setupRoutes(app: Application): void {
  // 注册系统路由（不带 API 前缀）
  Object.entries(systemRoutes).forEach(([name, { path, router, description }]) => {
    app.use(path, router);
    logger.debug({ name, path, description }, 'System route registered');
  });

  // 注册业务 API 路由（带 API 前缀）
  app.use(API_PREFIX, apiRoutes);
  logger.debug({ prefix: API_PREFIX }, 'API routes registered');

  // 打印路由配置
  printRouteConfiguration();
}

/**
 * 打印路由配置信息
 */
function printRouteConfiguration(): void {
  console.log('\n📋 Route Configuration:');
  console.log('='.repeat(60));

  console.log('\n🔧 System Routes:');
  Object.entries(systemRoutes).forEach(([, { path, description }]) => {
    console.log(`  ${path.padEnd(30)} - ${description}`);
  });

  console.log(`\n🌐 API Routes (prefix: ${API_PREFIX}):`);
  console.log(`  ${API_PREFIX}/auth              - 认证相关接口`);

  console.log(`\n${'='.repeat(60)}\n`);
}

/**
 * 获取完整的 API 路径
 */
export function getFullApiPath(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_PREFIX}${normalizedPath}`;
}
