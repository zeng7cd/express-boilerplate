/**
 * 数据库迁移脚本
 */
import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import mysql from 'mysql2/promise';

// 加载环境变量
config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

const connectionString = process.env.DATABASE_URL || 'mysql://root:password@localhost:3306/express_db';

async function runMigration() {
  console.log('🚀 Starting database migration...');

  const connection = await mysql.createConnection(connectionString);
  const db = drizzle(connection);

  try {
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

runMigration().catch((error) => {
  console.error(error);
  process.exit(1);
});
