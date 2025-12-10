# Express TypeScript Boilerplate

一个功能完善、生产就绪的 Express + TypeScript 后端项目模板，集成了现代化的开发工具和最佳实践。

## ✨ 特性

- 🚀 **TypeScript** - 类型安全的开发体验
- 🗃️ **Drizzle ORM** - 类型安全的数据库 ORM，支持 PostgreSQL
- 🔐 **JWT 认证** - 完整的用户认证和授权系统
- 📝 **Pino 日志** - 高性能结构化日志系统
- 🔄 **Redis 缓存** - 分布式缓存支持
- 🛡️ **安全防护** - Helmet、CORS、限流等安全中间件
- 📊 **健康检查** - 系统健康监控和指标收集
- 🎯 **模块化架构** - 清晰的代码组织和模块划分
- 🧪 **测试支持** - Vitest 单元测试和集成测试
- 🐳 **Docker 支持** - 容器化部署配置
- 📚 **API 文档** - Swagger/OpenAPI 文档自动生成

## 📋 技术栈

- **运行时**: Node.js 18+
- **框架**: Express 5.x
- **语言**: TypeScript 5.x
- **数据库**: PostgreSQL + Drizzle ORM
- **缓存**: Redis + ioredis
- **认证**: JWT (jsonwebtoken)
- **日志**: Pino
- **验证**: Zod
- **测试**: Vitest
- **代码规范**: ESLint + Prettier

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- PostgreSQL >= 14
- Redis >= 6.0
- pnpm >= 8.0.0

### 安装

```bash
# 克隆项目
git clone <repository-url>
cd express-typescript-boilerplate

# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env.development

# 编辑 .env.development 文件，配置数据库等信息
```

### 数据库设置

```bash
# 生成数据库迁移文件
pnpm db:generate

# 执行数据库迁移
pnpm db:migrate

# (可选) 填充测试数据
pnpm db:seed

# (可选) 打开 Drizzle Studio 可视化管理数据库
pnpm db:studio
```

### 启动开发服务器

```bash
# 开发模式（支持热重载）
pnpm start:dev

# 生产模式
pnpm build
pnpm start:prod
```

服务器将在 `http://localhost:8080` 启动

## 📁 项目结构

```
express-typescript-boilerplate/
├── src/
│   ├── core/                    # 核心功能模块
│   │   ├── cache/              # Redis 缓存服务
│   │   ├── config/             # 配置管理
│   │   ├── database/           # 数据库连接和 Schema
│   │   ├── jobs/               # 定时任务
│   │   ├── logger/             # 日志系统
│   │   ├── router/             # 路由注册器
│   │   └── services/           # 核心服务
│   ├── modules/                # 业务模块
│   │   ├── auth/               # 认证模块
│   │   ├── monitoring/         # 监控模块
│   │   └── users/              # 用户模块
│   ├── shared/                 # 共享资源
│   │   ├── decorators/         # 装饰器
│   │   ├── exceptions/         # 异常类
│   │   ├── middleware/         # 中间件
│   │   ├── schemas/            # 验证模式
│   │   ├── types/              # 类型定义
│   │   └── utils/              # 工具函数
│   ├── index.ts                # 应用入口
│   ├── server.ts               # 服务器配置
│   └── routes.ts               # 路由聚合
├── test/                       # 测试文件
│   ├── integration/            # 集成测试
│   └── unit/                   # 单元测试
├── drizzle/                    # 数据库迁移文件
├── docs/                       # 项目文档
├── logs/                       # 日志文件
├── .env.example                # 环境变量示例
├── drizzle.config.ts           # Drizzle 配置
├── tsconfig.json               # TypeScript 配置
└── package.json                # 项目依赖
```

## 🔧 环境变量配置

主要环境变量说明（详见 `.env.example`）：

```bash
# 应用配置
NODE_ENV=development              # 运行环境
PORT=8080                         # 服务端口
HOST=localhost                    # 服务主机
API_PREFIX=api                    # API 路径前缀

# 数据库配置
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Redis 配置
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT 配置
JWT_SECRET=your-secret-key        # 访问令牌密钥（至少64字符）
JWT_REFRESH_SECRET=your-refresh-secret  # 刷新令牌密钥
JWT_EXPIRES_IN=1h                 # 访问令牌过期时间
JWT_REFRESH_EXPIRES_IN=7d         # 刷新令牌过期时间

# 日志配置
LOGGER_LEVEL=info                 # 日志级别
LOG_TO_FILE=true                  # 是否写入文件
```

## 📚 核心功能文档

详细的使用文档请查看 `docs/` 目录：

- [路由系统使用指南](./docs/router.md) - 路由注册和管理
- [Drizzle ORM 使用指南](./docs/drizzle.md) - 数据库操作和查询
- [日志系统使用指南](./docs/logger.md) - 日志记录和管理
- [JWT 认证使用指南](./docs/jwt.md) - 用户认证和授权
- [缓存系统使用指南](./docs/cache.md) - Redis 缓存使用
- [工具函数使用指南](./docs/utils.md) - 异常处理、验证、分页等工具

## 🔌 API 端点

### 认证相关

```
POST   /api/auth/register        # 用户注册
POST   /api/auth/login           # 用户登录
POST   /api/auth/refresh         # 刷新令牌
POST   /api/auth/logout          # 用户登出（需认证）
GET    /api/auth/me              # 获取当前用户信息（需认证）
```

### 系统监控

```
GET    /health-check             # 健康检查
GET    /api-docs                 # API 文档（Swagger UI）
```

## 🧪 测试

```bash
# 运行所有测试
pnpm test

# 运行测试并生成覆盖率报告
pnpm test:cov

# 类型检查
pnpm type-check

# 代码检查
pnpm lint

# 代码格式化
pnpm format
```

## 🐳 Docker 部署

```bash
# 开发环境
docker-compose -f docker-compose.dev.yml up

# 生产环境
docker-compose up -d
```

## 📝 开发规范

### 代码风格

- 使用 ESLint 和 Prettier 保持代码一致性
- 遵循 TypeScript 严格模式
- 使用 async/await 处理异步操作
- 优先使用函数式编程风格

### 提交规范

遵循 Conventional Commits 规范：

```
feat: 新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式调整
refactor: 代码重构
test: 测试相关
chore: 构建/工具链相关
```

### 模块开发

1. 在 `src/modules/` 下创建新模块目录
2. 按照以下结构组织代码：
   ```
   module-name/
   ├── controllers/    # 控制器
   ├── services/       # 业务逻辑
   ├── dtos/          # 数据传输对象
   ├── schemas/       # 验证模式
   └── routes.ts      # 路由定义
   ```
3. 在 `src/routes.ts` 中注册模块路由

## 🔒 安全特性

- ✅ Helmet 安全头
- ✅ CORS 跨域保护
- ✅ 请求限流
- ✅ JWT 令牌认证
- ✅ 密码加密（bcrypt）
- ✅ SQL 注入防护（参数化查询）
- ✅ XSS 防护
- ✅ 请求体大小限制
- ✅ 令牌黑名单机制

## 🎯 性能优化

- Redis 缓存层
- 数据库连接池
- 请求日志异步处理
- 响应压缩
- 优雅关闭机制

## 📈 监控和日志

- 结构化日志（JSON 格式）
- 请求追踪（Request ID）
- 性能监控
- 健康检查端点
- 错误追踪（可集成 Sentry）

## 🤝 贡献指南

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: add some amazing feature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

## 📄 许可证

本项目采用 MIT 许可证

## 👥 作者

zeng

## 🙏 致谢

感谢所有开源项目的贡献者

---

如有问题或建议，欢迎提交 Issue 或 Pull Request！
