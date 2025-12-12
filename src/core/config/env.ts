import dotenv from 'dotenv';
import { z } from 'zod';
import chalk from 'chalk';

// 动态选择 .env 文件
const envFile = process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : '.env';
dotenv.config({ path: envFile });

// 危险的默认值列表
const DANGEROUS_DEFAULTS = {
  JWT_SECRET: [
    'your-super-secret-jwt-key-min-64-chars-long-for-security-please-change-this-in-production',
    'change-me',
    'secret',
    'jwt-secret',
    'your-secret-key',
  ],
  JWT_REFRESH_SECRET: [
    'your-super-secret-refresh-token-key-min-64-chars-different-from-access',
    'change-me',
    'secret',
    'refresh-secret',
  ],
};

/**
 * 检查是否使用了危险的默认值
 */
function checkDangerousDefaults(env: any): void {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 检查 JWT_SECRET
  if (DANGEROUS_DEFAULTS.JWT_SECRET.includes(env.JWT_SECRET)) {
    errors.push('JWT_SECRET is using a default or weak value');
  }

  // 检查 JWT_REFRESH_SECRET
  if (env.JWT_REFRESH_SECRET && DANGEROUS_DEFAULTS.JWT_REFRESH_SECRET.includes(env.JWT_REFRESH_SECRET)) {
    errors.push('JWT_REFRESH_SECRET is using a default or weak value');
  }

  // 检查密钥强度
  if (env.JWT_SECRET && env.JWT_SECRET.length < 64) {
    warnings.push('JWT_SECRET should be at least 64 characters for better security');
  }

  // 生产环境必须修改默认值
  if (env.NODE_ENV === 'production' && errors.length > 0) {
    console.error(chalk.red('\n❌ SECURITY ERROR: Dangerous default values detected!\n'));
    errors.forEach((error) => {
      console.error(chalk.red(`  - ${error}`));
    });
    console.error(chalk.yellow('\n⚠️  Please update your .env.production file with secure values.'));
    console.error(chalk.cyan('\n💡 Generate secure keys with: pnpm tsx scripts/generate-secrets.ts\n'));
    process.exit(1);
  }

  // 开发环境警告
  if (env.NODE_ENV === 'development' && (errors.length > 0 || warnings.length > 0)) {
    if (errors.length > 0) {
      console.warn(chalk.yellow('\n⚠️  WARNING: Using default values for sensitive configuration:\n'));
      errors.forEach((error) => {
        console.warn(chalk.yellow(`  - ${error}`));
      });
    }
    if (warnings.length > 0) {
      warnings.forEach((warning) => {
        console.warn(chalk.yellow(`  - ${warning}`));
      });
    }
    console.warn(chalk.cyan('  Please update your .env.development file.\n'));
  }
}

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
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters for security'),
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
  console.error(chalk.red('\n❌ Invalid environment variables:\n'));
  console.error(parsedEnv.error.format());
  process.exit(1);
}

// ✅ 检查危险的默认值
checkDangerousDefaults(parsedEnv.data);

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
