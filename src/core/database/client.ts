/**
 * Prisma数据库客户端配置
 */
import { PrismaClient } from '../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { env } from '../config/env';

// 创建PostgreSQL连接池
const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

// 创建Prisma适配器
const adapter = new PrismaPg(pool);

// 创建Prisma客户端实例
export const prisma = new PrismaClient({
  adapter,
  log: env.isDevelopment ? ['query', 'info', 'warn', 'error'] : ['error'],
});

// 测试数据库连接
export async function testDatabaseConnection(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

// 优雅关闭数据库连接
export async function closeDatabaseConnection(): Promise<void> {
  try {
    await prisma.$disconnect();
    await pool.end();
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
    await prisma.$queryRaw`SELECT 1`;
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
