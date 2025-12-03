import dotenv from 'dotenv';
import { z } from 'zod';

// 动态选择 .env 文件
const envFile = process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : '.env';
dotenv.config({ path: envFile });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  HOST: z.string().min(1).default('localhost'),
  PORT: z.coerce.number().int().positive().default(8080),
  CORS_ORIGIN: z.string().url().default('http://localhost:8080'),
  API_PREFIX: z.string().default('api'),
  COMMON_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(1000),
  COMMON_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(1000),

  // Prisma 数据库连接
  DATABASE_URL: z.string().url(),

  // 数据库配置
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive(),
  DB_USERNAME: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_DATABASE: z.string().min(1),

  // JWT配置
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('1h'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // 密码加密
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),

  // 会话配置
  SESSION_TIMEOUT: z.coerce.number().int().positive().default(3600),

  // 日志配置
  LOGGER_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_TO_FILE: z
    .string()
    .default('true')
    .transform((val) => val === 'true'),
  LOG_FILE_MAX_SIZE: z.string().default('10MB'),
  LOG_FILE_MAX_FILES: z.coerce.number().int().positive().default(10),
  LOG_CLEANUP_DAYS: z.coerce.number().int().positive().default(30),
  LOG_HEALTH_CHECK_INTERVAL: z.coerce.number().int().positive().default(60),
  LOG_PERFORMANCE_MONITORING: z.coerce.boolean().default(true),

  // Redis配置
  REDIS_HOST: z.string().default('127.0.0.1'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().int().min(0).default(0),

  // 监控配置
  METRICS_ENABLED: z.coerce.boolean().default(true),
  HEALTH_CHECK_ENABLED: z.coerce.boolean().default(true),
});

type EnvType = z.infer<typeof envSchema>;

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('Invalid environment variables:', parsedEnv.error.format());
  throw new Error('Invalid environment variables');
}

export const env: EnvType & {
  isDevelopment: boolean;
  isProduction: boolean;
  isTest: boolean;
} = {
  ...parsedEnv.data,
  isDevelopment: parsedEnv.data.NODE_ENV === 'development',
  isProduction: parsedEnv.data.NODE_ENV === 'production',
  isTest: parsedEnv.data.NODE_ENV === 'test',
};
