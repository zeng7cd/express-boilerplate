# 🚀 快速启动指南

## 前置要求

- Node.js >= 20
- pnpm >= 10
- PostgreSQL >= 16
- Redis >= 7
- Docker (可选，用于容器化部署)

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

项目已配置好开发环境的数据库连接，直接使用即可：

```bash
# .env.development 已配置
DATABASE_URL="postgresql://postgres:T7m!pL9@qW2s@192.168.70.5:5432/postgres?schema=public"
```

### 3. 生成 Prisma Client

```bash
pnpm run db:generate
```

### 4. 运行数据库迁移

```bash
# 开发环境
pnpm run db:migrate

# 或直接推送 schema（不创建迁移文件）
pnpm run db:push
```

### 5. 启动开发服务器

```bash
pnpm run start:dev
```

服务器将在 http://localhost:8080 启动

## 🔧 开发工具

### 数据库管理

```bash
# 打开 Prisma Studio
pnpm run db:studio
```

### 代码质量检查

```bash
# 类型检查
pnpm run type-check

# 代码检查
pnpm run lint:check

# 自动修复
pnpm run lint

# 格式化代码
pnpm run format
```

### 测试

```bash
# 运行测试
pnpm run test

# 测试覆盖率
pnpm run test:cov
```

## 📦 使用 Docker Compose（推荐）

### 开发环境

启动所有开发依赖（PostgreSQL、Redis、pgAdmin、Redis Commander）：

```bash
docker-compose -f docker-compose.dev.yml up -d
```

访问管理工具：
- pgAdmin: http://localhost:5050 (admin@example.com / admin)
- Redis Commander: http://localhost:8081

### 生产环境

```bash
# 构建并启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f app

# 停止服务
docker-compose down
```

## 🔑 重要配置

### JWT 密钥

**⚠️ 生产环境必须更换密钥！**

生成安全的密钥：

```bash
# Linux/Mac
openssl rand -base64 64

# Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

更新 `.env.production`:

```env
JWT_SECRET=your-generated-secret-here
JWT_REFRESH_SECRET=your-different-generated-secret-here
```

### 数据库连接池

根据服务器配置调整：

```env
DB_POOL_MIN=5
DB_POOL_MAX=20
DB_CONNECTION_TIMEOUT=2000
DB_IDLE_TIMEOUT=30000
```

## 📚 API 文档

### 健康检查

```bash
# 基础健康检查
curl http://localhost:8080/health-check

# 详细健康检查
curl http://localhost:8080/health-check/detailed

# Kubernetes 就绪检查
curl http://localhost:8080/health-check/ready

# Kubernetes 存活检查
curl http://localhost:8080/health-check/live
```

### 认证 API

#### 注册

```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "testuser",
    "password": "Test@1234",
    "firstName": "Test",
    "lastName": "User"
  }'
```

#### 登录

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "Test@1234"
  }'
```

#### 刷新 Token

```bash
curl -X POST http://localhost:8080/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "your-refresh-token"
  }'
```

#### 登出

```bash
curl -X POST http://localhost:8080/api/auth/logout \
  -H "Authorization: Bearer your-access-token"
```

#### 获取当前用户信息

```bash
curl http://localhost:8080/api/auth/me \
  -H "Authorization: Bearer your-access-token"
```

## 🛠️ 常见问题

### 1. 数据库连接失败

检查数据库是否运行：

```bash
# 使用 Docker
docker-compose -f docker-compose.dev.yml ps

# 测试连接
psql -h 192.168.70.5 -U postgres -d postgres
```

### 2. Redis 连接失败

检查 Redis 配置：

```bash
# 测试 Redis 连接
redis-cli -h 127.0.0.1 -p 6379 ping
```

### 3. Prisma 生成失败

清理并重新生成：

```bash
rm -rf src/generated/prisma
pnpm run db:generate
```

### 4. 端口被占用

修改 `.env.development` 中的 PORT：

```env
PORT=3000
```

## 📖 更多文档

- [项目审查报告](./项目审查报告.md)
- [优化总结](./OPTIMIZATION_SUMMARY.md)
- [README](./README.md)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License
