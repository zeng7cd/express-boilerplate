import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "../config/envConfig";
import { getAppPinoLogger } from "../utils/pino";
import * as schema from "./schema/index";

// 创建数据库连接池
const pool = new Pool({
	host: env.DB_HOST,
	port: env.DB_PORT,
	user: env.DB_USERNAME,
	password: env.DB_PASSWORD,
	database: env.DB_DATABASE,
	max: 10, // 连接池最大连接数
	idleTimeoutMillis: 20000, // 空闲超时时间（毫秒）
	connectionTimeoutMillis: 10000, // 连接超时时间（毫秒）
});

export const db = drizzle(pool, {
	schema: { ...schema },
}) as NodePgDatabase<typeof schema>;

// 数据库连接测试函数（带重试机制）
export async function testDatabaseConnectionWithRetry(maxRetries = 3): Promise<void> {
	const logger = getAppPinoLogger();

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			const client = await pool.connect();
			await client.query("SELECT 1 as test");
			client.release();
			logger.info("Database connection test succeeded");
			return;
		} catch (error) {
			logger.warn({ attempt, maxRetries, err: error }, "Database connection attempt failed");

			if (attempt === maxRetries) {
				logger.error({ err: error }, "Database connection failed after all retries");
				const errorMessage = error instanceof Error ? error.message : String(error);
				throw new Error(`Database connection failed after ${maxRetries} attempts: ${errorMessage}`);
			}

			// 指数退避重试
			await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 1000));
		}
	}
}

// 保持原函数以兼容现有代码
export async function testDatabaseConnection(): Promise<void> {
	return testDatabaseConnectionWithRetry();
}

// 添加连接池健康检查
export async function checkDatabaseHealth(): Promise<{ healthy: boolean; details: any }> {
	const logger = getAppPinoLogger();

	try {
		const client = await pool.connect();
		const result = await client.query("SELECT NOW() as current_time, version() as db_version");
		client.release();

		return {
			healthy: true,
			details: {
				currentTime: result.rows[0].current_time,
				version: result.rows[0].db_version,
				totalConnections: pool.totalCount,
				idleConnections: pool.idleCount,
				waitingConnections: pool.waitingCount,
			},
		};
	} catch (error) {
		logger.error({ err: error }, "Database health check failed");
		const errorMessage = error instanceof Error ? error.message : String(error);
		return {
			healthy: false,
			details: { error: errorMessage },
		};
	}
}
