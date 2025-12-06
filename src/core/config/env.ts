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

  // 数据库连接
  DATABASE_URL: z.string().url(),

  // JWT配置
  JWT_SECRET: z
    .string()
    .min(64, 'JWT_SECRET must be at least 64 characters for security')
    .refine(
      (val) => val !== 'your-super-secret-jwt-key-min-64-chars-long-for-security-please-change-this-in-production',
      'JWT_SECRET must be changed from default value in production',
    ),
  JWT_REFRESH_SECRET: z.string().min(64, 'JWT_REFRESH_SECRET must be at least 64 characters').optional().default(''),
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

  // 安全配置
  API_KEY: z.string().optional(),
  ENABLE_CSRF_PROTECTION: z.coerce.boolean().default(false),
  ALLOWED_IPS: z.string().optional(),

  // Sentry 错误追踪
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),

  // 功能开关
  FEATURE_REGISTRATION_ENABLED: z.coerce.boolean().default(true),
  FEATURE_EMAIL_VERIFICATION: z.coerce.boolean().default(false),
  FEATURE_TWO_FACTOR_AUTH: z.coerce.boolean().default(false),

  // 数据库连接池配置
  DB_POOL_MIN: z.coerce.number().int().positive().default(5),
  DB_POOL_MAX: z.coerce.number().int().positive().default(20),
  DB_CONNECTION_TIMEOUT: z.coerce.number().int().positive().default(2000),
  DB_IDLE_TIMEOUT: z.coerce.number().int().positive().default(30000),
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
