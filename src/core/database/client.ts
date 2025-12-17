/**
 * Drizzle 数据库客户端配置
 */
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

import * as schema from './schema';
import { env } from '../config/env';

// 创建 MySQL 连接池
// mysql2 支持直接传递 URL 字符串或配置对象
const poolConnection = mysql.createPool(env.DATABASE_URL);

// 创建 Drizzle 实例
export const db = drizzle(poolConnection, { schema, mode: 'default' });

// 导出 schema 供外部使用
export { schema };

// 测试数据库连接
export async function testDatabaseConnection(): Promise<void> {
  try {
    await poolConnection.query('SELECT 1');
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

// 优雅关闭数据库连接
export async function closeDatabaseConnection(): Promise<void> {
  try {
    await poolConnection.end();
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
    await poolConnection.query('SELECT 1');
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
