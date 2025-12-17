import { afterAll, beforeAll } from 'vitest';

import { testDatabaseConnection } from '../src/core/database';

beforeAll(async () => {
  // 测试环境设置
  process.env.NODE_ENV = 'test';
  process.env.LOG_TO_FILE = 'false';

  // 确保数据库连接
  await testDatabaseConnection();
});

afterAll(async () => {
  // 清理测试环境
});
