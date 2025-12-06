/**
 * Drizzle 数据库客户端配置
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../config/env';
import * as schema from './schema';

// 创建 PostgreSQL 连接
const connectionString = env.DATABASE_URL;

// 创建查询客户端
const queryClient = postgres(connectionString, {
  max: env.DB_POOL_MAX, // 最大连接数
  idle_timeout: env.DB_IDLE_TIMEOUT / 1000, // 空闲超时（秒）
  connect_timeout: env.DB_CONNECTION_TIMEOUT / 1000, // 连接超时（秒）
  onnotice: env.isDevelopment ? console.log : undefined,
});

// 创建 Drizzle 实例
export const db = drizzle(queryClient, { schema });

// 导出 schema 供外部使用
export { schema };

// 测试数据库连接
export async function testDatabaseConnection(): Promise<void> {
  try {
    await queryClient`SELECT 1`;
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

// 优雅关闭数据库连接
export async function closeDatabaseConnection(): Promise<void> {
  try {
    await queryClient.end();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
    throw error;
  }
}

// 数据库健康检查
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  details: {
    connected?: boolean;
    error?: string;
  };
}> {
  try {
    await queryClient`SELECT 1`;
    return {
      healthy: true,
      details: {
        connected: true,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      healthy: false,
      details: { error: errorMessage },
    };
  }
}
