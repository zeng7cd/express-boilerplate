import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// 加载环境变量
config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

export default defineConfig({
  schema: './src/core/database/schema/index.ts',
  out: './drizzle',
  dialect: 'mysql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'mysql://root:password@localhost:3306/express_db',
  },
  verbose: true,
  strict: true,
});
