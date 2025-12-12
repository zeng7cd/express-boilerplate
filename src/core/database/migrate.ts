/**
 * 数据库迁移脚本
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { config } from 'dotenv';

// 加载环境变量
config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:T7m!pL9@qW2s@192.168.146.5:5432/postgres';

async function runMigration() {
  console.log('🚀 Starting database migration...');

  const migrationClient = postgres(connectionString, { max: 1 });
  const db = drizzle(migrationClient);

  try {
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await migrationClient.end();
  }
}

runMigration().catch((error) => {
  console.error(error);
  process.exit(1);
});
