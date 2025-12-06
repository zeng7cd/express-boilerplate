import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';

// 加载环境变量
config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

export default defineConfig({
  schema: './src/core/database/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:T7m!pL9@qW2s@192.168.146.5:5432/postgres',
  },
  verbose: true,
  strict: true,
});
