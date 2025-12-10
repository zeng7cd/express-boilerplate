# 缓存系统使用指南

本项目使用 Redis 作为缓存层，提供高性能的数据缓存功能。

## 📋 目录

- [简介](#简介)
- [配置](#配置)
- [基本使用](#基本使用)
- [缓存装饰器](#缓存装饰器)
- [缓存策略](#缓存策略)
- [最佳实践](#最佳实践)

## 简介

### 为什么使用缓存？

- ⚡ **提升性能** - 减少数据库查询，加快响应速度
- 💰 **降低成本** - 减少数据库负载，节省资源
- 🔄 **提高可用性** - 缓存可以在数据库故障时提供服务
- 📊 **支持高并发** - Redis 可以处理大量并发请求

### Redis 特性

- 内存存储，读写速度快
- 支持多种数据结构（字符串、哈希、列表、集合等）
- 支持数据持久化
- 支持主从复制和集群

## 配置

### 环境变量

```bash
# Redis 配置
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

### 连接配置

位置：`src/core/cache/redis.ts`

```typescript
import Redis from 'ioredis';

const redis = new Redis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD,
  db: env.REDIS_DB,
  retryStrategy: (times) => Math.min(times * 50, 2000),
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});
```

## 基本使用

### 导入缓存服务

```typescript
import { cacheService } from '@/core/cache';
```

### 设置缓存

```typescript
// 设置缓存（默认过期时间 3600 秒）
await cacheService.set('user:123', userData);

// 设置缓存并指定过期时间（秒）
await cacheService.set('user:123', userData, 300); // 5分钟后过期

// 缓存对象
await cacheService.set('user:profile:123', {
  id: '123',
  name: 'John Doe',
  email: 'john@example.com',
}, 600);

// 缓存数组
await cacheService.set('users:list', [user1, user2, user3], 300);
```

### 获取缓存

```typescript
// 获取缓存
const userData = await cacheService.get<User>('user:123');

if (userData) {
  console.log('Cache hit:', userData);
} else {
  console.log('Cache miss');
  // 从数据库获取数据
  const user = await db.query.users.findFirst({...});
  // 设置缓存
  await cacheService.set('user:123', user, 300);
}
```

### 删除缓存

```typescript
// 删除单个缓存
await cacheService.del('user:123');

// 删除多个缓存
await Promise.all([
  cacheService.del('user:123'),
  cacheService.del('user:profile:123'),
  cacheService.del('user:permissions:123'),
]);
```

### 健康检查

```typescript
const health = await cacheService.health();

if (health.healthy) {
  console.log('Redis is healthy');
  console.log('Ping:', health.details.ping);
} else {
  console.error('Redis is unhealthy:', health.details.error);
}
```

## 缓存装饰器

### @Cacheable 装饰器

自动缓存方法的返回结果。

```typescript
import { Cacheable } from '@/shared/decorators/cache.decorator';

class UserService {
  /**
   * 缓存用户数据
   * 缓存键: user:["userId"]
   * 过期时间: 300秒
   */
  @Cacheable({ key: 'user', ttl: 300 })
  async getUserById(userId: string) {
    return await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
  }

  /**
   * 缓存用户列表
   * 缓存键: users:list
   * 过期时间: 60秒
   */
  @Cacheable({ key: 'users:list', ttl: 60, includeArgs: false })
  async getAllUsers() {
    return await db.select().from(users);
  }

  /**
   * 条件缓存
   * 只缓存活跃用户
   */
  @Cacheable({
    key: 'user:active',
    ttl: 300,
    condition: (result) => result?.isActive === true,
  })
  async getActiveUser(userId: string) {
    return await db.query.users.findFirst({
      where: and(eq(users.id, userId), eq(users.isActive, true)),
    });
  }
}
```

### @CacheEvict 装饰器

在方法执行后自动清除相关缓存。

```typescript
import { CacheEvict } from '@/shared/decorators/cache.decorator';

class UserService {
  /**
   * 更新用户后清除缓存
   */
  @CacheEvict({ key: 'user' })
  async updateUser(userId: string, data: UpdateUserDto) {
    const [updated] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, userId))
      .returning();
    
    return updated;
  }

  /**
   * 删除用户后清除缓存
   */
  @CacheEvict({ key: 'user' })
  async deleteUser(userId: string) {
    await db.delete(users).where(eq(users.id, userId));
  }
}
```

### 装饰器选项

```typescript
interface CacheOptions {
  /** 缓存键前缀 */
  key: string;
  
  /** 缓存过期时间（秒），默认 300 秒 */
  ttl?: number;
  
  /** 是否缓存结果的条件函数 */
  condition?: (result: any) => boolean;
  
  /** 是否包含参数在缓存键中，默认 true */
  includeArgs?: boolean;
}
```

## 缓存策略

### 1. Cache-Aside（旁路缓存）

最常用的缓存策略，应用程序直接与缓存和数据库交互。

```typescript
class UserService {
  async getUserById(userId: string): Promise<User | null> {
    // 1. 尝试从缓存获取
    const cached = await cacheService.get<User>(`user:${userId}`);
    if (cached) {
      return cached;
    }

    // 2. 缓存未命中，从数据库查询
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    // 3. 将结果写入缓存
    if (user) {
      await cacheService.set(`user:${userId}`, user, 300);
    }

    return user;
  }

  async updateUser(userId: string, data: UpdateUserDto): Promise<User> {
    // 1. 更新数据库
    const [updated] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, userId))
      .returning();

    // 2. 删除缓存（让下次读取时重新加载）
    await cacheService.del(`user:${userId}`);

    return updated;
  }
}
```

### 2. Write-Through（写穿）

写入数据时同时更新缓存和数据库。

```typescript
class UserService {
  async updateUser(userId: string, data: UpdateUserDto): Promise<User> {
    // 1. 更新数据库
    const [updated] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, userId))
      .returning();

    // 2. 同时更新缓存
    await cacheService.set(`user:${userId}`, updated, 300);

    return updated;
  }
}
```

### 3. Write-Behind（写回）

先写入缓存，异步写入数据库。

```typescript
class UserService {
  async updateUser(userId: string, data: UpdateUserDto): Promise<void> {
    // 1. 立即更新缓存
    const cached = await cacheService.get<User>(`user:${userId}`);
    const updated = { ...cached, ...data };
    await cacheService.set(`user:${userId}`, updated, 300);

    // 2. 异步更新数据库
    setImmediate(async () => {
      try {
        await db
          .update(users)
          .set(data)
          .where(eq(users.id, userId));
      } catch (error) {
        logger.error('Failed to sync user to database', error);
      }
    });
  }
}
```

### 4. 缓存预热

在应用启动时预先加载热点数据。

```typescript
import { CacheHelper } from '@/shared/decorators/cache.decorator';

async function warmupCache() {
  // 预热用户列表
  await CacheHelper.warmup(
    'users:active',
    async () => {
      return await db.query.users.findMany({
        where: eq(users.isActive, true),
      });
    },
    600
  );

  // 预热配置数据
  await CacheHelper.warmup(
    'config:app',
    async () => {
      return await db.query.configs.findMany();
    },
    3600
  );
}

// 在应用启动时调用
await warmupCache();
```

## 最佳实践

### 1. 缓存键命名规范

```typescript
// ✅ 推荐：使用冒号分隔的层级结构
'user:123'
'user:profile:123'
'user:permissions:123'
'session:abc123'
'cache:product:list:page:1'

// ❌ 避免：无结构的键名
'user123'
'userprofile123'
'product_list_page_1'
```

### 2. 合理设置过期时间

```typescript
// 根据数据特性设置不同的过期时间

// 用户基本信息（变化较少）
await cacheService.set('user:123', user, 3600); // 1小时

// 用户会话（需要及时失效）
await cacheService.set('session:abc', session, 1800); // 30分钟

// 热点数据（频繁访问）
await cacheService.set('trending:posts', posts, 300); // 5分钟

// 配置数据（很少变化）
await cacheService.set('config:app', config, 86400); // 24小时
```

### 3. 缓存空值防止缓存穿透

```typescript
async function getUserById(userId: string): Promise<User | null> {
  const cached = await cacheService.get<User | 'NULL'>(`user:${userId}`);
  
  // 缓存命中
  if (cached !== null) {
    return cached === 'NULL' ? null : cached;
  }

  // 查询数据库
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  // 缓存结果（包括空值）
  await cacheService.set(
    `user:${userId}`,
    user || 'NULL',
    user ? 3600 : 60 // 空值使用较短的过期时间
  );

  return user;
}
```

### 4. 使用缓存锁防止缓存击穿

```typescript
import { nanoid } from 'nanoid';

async function getUserWithLock(userId: string): Promise<User | null> {
  const cacheKey = `user:${userId}`;
  const lockKey = `lock:${cacheKey}`;
  const lockValue = nanoid();

  // 尝试从缓存获取
  const cached = await cacheService.get<User>(cacheKey);
  if (cached) {
    return cached;
  }

  // 尝试获取锁
  const locked = await cacheService.set(lockKey, lockValue, 10);
  if (!locked) {
    // 获取锁失败，等待后重试
    await new Promise(resolve => setTimeout(resolve, 100));
    return getUserWithLock(userId);
  }

  try {
    // 再次检查缓存（双重检查）
    const cached = await cacheService.get<User>(cacheKey);
    if (cached) {
      return cached;
    }

    // 查询数据库
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    // 设置缓存
    if (user) {
      await cacheService.set(cacheKey, user, 3600);
    }

    return user;
  } finally {
    // 释放锁
    await cacheService.del(lockKey);
  }
}
```

### 5. 批量操作优化

```typescript
// ✅ 推荐：批量获取
async function getUsersByIds(userIds: string[]): Promise<User[]> {
  const cacheKeys = userIds.map(id => `user:${id}`);
  
  // 批量从缓存获取
  const cached = await Promise.all(
    cacheKeys.map(key => cacheService.get<User>(key))
  );

  // 找出缓存未命中的 ID
  const missedIds = userIds.filter((_, index) => !cached[index]);

  if (missedIds.length > 0) {
    // 批量查询数据库
    const users = await db.query.users.findMany({
      where: inArray(users.id, missedIds),
    });

    // 批量写入缓存
    await Promise.all(
      users.map(user => 
        cacheService.set(`user:${user.id}`, user, 3600)
      )
    );

    // 合并结果
    const userMap = new Map(users.map(u => [u.id, u]));
    return userIds.map((id, index) => 
      cached[index] || userMap.get(id)
    ).filter(Boolean) as User[];
  }

  return cached.filter(Boolean) as User[];
}

// ❌ 避免：循环单次操作
async function getUsersByIds(userIds: string[]): Promise<User[]> {
  const users = [];
  for (const id of userIds) {
    const user = await cacheService.get<User>(`user:${id}`);
    if (user) users.push(user);
  }
  return users;
}
```

### 6. 缓存分层

```typescript
// 多级缓存策略
class CacheManager {
  private memoryCache = new Map<string, any>();

  async get<T>(key: string): Promise<T | null> {
    // 1. 检查内存缓存（L1）
    if (this.memoryCache.has(key)) {
      return this.memoryCache.get(key);
    }

    // 2. 检查 Redis 缓存（L2）
    const cached = await cacheService.get<T>(key);
    if (cached) {
      // 回填内存缓存
      this.memoryCache.set(key, cached);
      return cached;
    }

    return null;
  }

  async set(key: string, value: any, ttl: number): Promise<void> {
    // 同时写入两级缓存
    this.memoryCache.set(key, value);
    await cacheService.set(key, value, ttl);

    // 内存缓存定时清理
    setTimeout(() => {
      this.memoryCache.delete(key);
    }, Math.min(ttl * 1000, 60000)); // 最多保留1分钟
  }
}
```

### 7. 监控缓存命中率

```typescript
class CacheMetrics {
  private hits = 0;
  private misses = 0;

  recordHit(): void {
    this.hits++;
  }

  recordMiss(): void {
    this.misses++;
  }

  getHitRate(): number {
    const total = this.hits + this.misses;
    return total > 0 ? this.hits / total : 0;
  }

  reset(): void {
    this.hits = 0;
    this.misses = 0;
  }
}

const metrics = new CacheMetrics();

async function getCachedData(key: string) {
  const cached = await cacheService.get(key);
  
  if (cached) {
    metrics.recordHit();
    return cached;
  }
  
  metrics.recordMiss();
  // 从数据库获取...
}

// 定期输出缓存命中率
setInterval(() => {
  logger.info('Cache hit rate', {
    hitRate: metrics.getHitRate(),
  });
  metrics.reset();
}, 60000); // 每分钟
```

### 8. 缓存更新策略

```typescript
class UserService {
  /**
   * 更新用户时的缓存处理
   */
  async updateUser(userId: string, data: UpdateUserDto): Promise<User> {
    // 1. 更新数据库
    const [updated] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, userId))
      .returning();

    // 2. 清除相关缓存
    await Promise.all([
      cacheService.del(`user:${userId}`),
      cacheService.del(`user:profile:${userId}`),
      cacheService.del(`user:permissions:${userId}`),
      // 清除列表缓存
      cacheService.del('users:list'),
      cacheService.del('users:active'),
    ]);

    return updated;
  }
}
```

### 9. 缓存降级

```typescript
async function getUserWithFallback(userId: string): Promise<User | null> {
  try {
    // 尝试从缓存获取
    const cached = await cacheService.get<User>(`user:${userId}`);
    if (cached) {
      return cached;
    }
  } catch (error) {
    logger.warn('Cache service unavailable, falling back to database', error);
  }

  // 缓存失败或未命中，直接查询数据库
  return await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
}
```

### 10. 缓存数据版本控制

```typescript
// 使用版本号管理缓存
const CACHE_VERSION = 'v1';

async function setVersionedCache(key: string, value: any, ttl: number) {
  const versionedKey = `${CACHE_VERSION}:${key}`;
  await cacheService.set(versionedKey, value, ttl);
}

async function getVersionedCache<T>(key: string): Promise<T | null> {
  const versionedKey = `${CACHE_VERSION}:${key}`;
  return await cacheService.get<T>(versionedKey);
}

// 当数据结构变化时，只需更新版本号
// const CACHE_VERSION = 'v2';
```

## 常见问题

### Q: 如何处理缓存雪崩？

A: 使用随机过期时间：

```typescript
const baseTime = 3600;
const randomTime = Math.floor(Math.random() * 300); // 0-5分钟
await cacheService.set(key, value, baseTime + randomTime);
```

### Q: 如何处理缓存穿透？

A: 缓存空值或使用布隆过滤器：

```typescript
// 方法1: 缓存空值
if (!user) {
  await cacheService.set(`user:${userId}`, 'NULL', 60);
}

// 方法2: 使用布隆过滤器（需要额外实现）
if (!bloomFilter.mightContain(userId)) {
  return null; // 直接返回，不查询数据库
}
```

### Q: 如何清除所有缓存？

A: 使用 Redis FLUSHDB 命令（谨慎使用）：

```typescript
// 仅在开发环境使用
if (env.isDevelopment) {
  await redis.flushdb();
}
```

### Q: 如何监控 Redis 性能？

A: 使用 Redis INFO 命令：

```typescript
const info = await redis.info();
console.log(info);
```

## 相关资源

- [Redis 官方文档](https://redis.io/documentation)
- [ioredis 文档](https://github.com/luin/ioredis)
- [缓存设计模式](https://docs.microsoft.com/en-us/azure/architecture/patterns/cache-aside)
