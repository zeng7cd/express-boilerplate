/**
 * 创建数据库脚本
 */
import { config } from 'dotenv';
import mysql from 'mysql2/promise';

// 加载环境变量
config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

async function createDatabase() {
  const databaseUrl = process.env.DATABASE_URL || 'mysql://root:password@localhost:3306/express_dev';

  // 解析数据库 URL
  const url = new URL(databaseUrl);
  const dbName = url.pathname.slice(1); // 移除开头的 /

  // 创建不带数据库名的连接
  const connectionUrl = `${url.protocol}//${url.username}:${url.password}@${url.host}`;

  console.log('🔌 Connecting to MySQL server...');
  console.log(`📍 Host: ${url.host}`);
  console.log(`🗄️  Database to create: ${dbName}`);

  let connection;

  try {
    connection = await mysql.createConnection(connectionUrl);

    // 检查数据库是否存在
    const [databases] = await connection.query(
      'SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?',
      [dbName],
    );

    if ((databases as any[]).length > 0) {
      console.log(`✅ Database '${dbName}' already exists`);
    } else {
      // 创建数据库
      await connection.query(`CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      console.log(`✅ Database '${dbName}' created successfully`);
    }
  } catch (error) {
    console.error('❌ Failed to create database:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createDatabase()
  .then(() => {
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
