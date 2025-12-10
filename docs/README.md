# 项目文档索引

欢迎查阅 Express TypeScript Boilerplate 项目文档！

## 📚 文档列表

### 核心功能

1. **[路由系统使用指南](./router.md)**
   - 路由注册器使用
   - 模块化路由管理
   - RESTful API 设计
   - 路由中间件配置

2. **[Drizzle ORM 使用指南](./drizzle.md)**
   - 数据库连接配置
   - Schema 定义
   - 基本 CRUD 操作
   - 高级查询技巧
   - 事务处理
   - 数据库迁移

3. **[日志系统使用指南](./logger.md)**
   - Pino 日志配置
   - 日志级别管理
   - 结构化日志
   - 请求追踪
   - 性能监控

4. **[JWT 认证使用指南](./jwt.md)**
   - JWT 令牌生成和验证
   - 用户认证流程
   - 刷新令牌机制
   - 权限控制
   - 安全最佳实践

5. **[缓存系统使用指南](./cache.md)**
   - Redis 缓存配置
   - 缓存装饰器
   - 缓存策略
   - 性能优化
   - 缓存问题处理

6. **[工具函数使用指南](./utils.md)**
   - 异常处理
   - 响应封装
   - 数据验证
   - 分页工具
   - 软删除工具

## 🚀 快速导航

### 新手入门

如果你是第一次使用本项目，建议按以下顺序阅读：

1. 先阅读根目录的 [README.md](../README.md) 了解项目概况
2. 查看 [路由系统](./router.md) 了解如何组织 API
3. 学习 [Drizzle ORM](./drizzle.md) 掌握数据库操作
4. 了解 [JWT 认证](./jwt.md) 实现用户系统
5. 学习 [日志系统](./logger.md) 进行调试和监控

### 进阶开发

当你熟悉基础功能后，可以深入学习：

- [缓存系统](./cache.md) - 提升应用性能
- [工具函数](./utils.md) - 提高开发效率

## 📖 文档说明

### 文档结构

每个文档都包含以下部分：

- **简介** - 功能概述和使用场景
- **配置** - 环境变量和初始化配置
- **基本使用** - 常见用法和示例代码
- **高级功能** - 进阶特性和技巧
- **最佳实践** - 推荐的使用方式
- **常见问题** - FAQ 和问题解决

### 代码示例

文档中的所有代码示例都可以直接在项目中使用。示例代码遵循以下约定：

```typescript
// ✅ 推荐的做法
const goodExample = 'This is recommended';

// ❌ 不推荐的做法
const badExample = 'This should be avoided';
```

### 类型标注

文档中使用以下图标标注重要信息：

- 🎯 **核心概念** - 重要的概念和原理
- ⚡ **性能提示** - 性能优化建议
- 🔒 **安全提示** - 安全相关的注意事项
- ⚠️ **警告** - 需要特别注意的内容
- 💡 **提示** - 有用的小技巧

## 🔗 相关资源

### 官方文档

- [Express.js](https://expressjs.com/)
- [TypeScript](https://www.typescriptlang.org/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Pino](https://getpino.io/)
- [Redis](https://redis.io/)
- [Zod](https://zod.dev/)

### 学习资源

- [Node.js 最佳实践](https://github.com/goldbergyoni/nodebestpractices)
- [TypeScript 深入理解](https://basarat.gitbook.io/typescript/)
- [RESTful API 设计指南](https://restfulapi.net/)

## 🤝 贡献文档

如果你发现文档中有错误或需要改进的地方，欢迎：

1. 提交 Issue 报告问题
2. 提交 Pull Request 改进文档
3. 在团队内部分享使用经验

### 文档编写规范

- 使用清晰的标题层级
- 提供完整的代码示例
- 包含实际的使用场景
- 标注重要的注意事项
- 保持文档的及时更新

## 📝 更新日志

- **2024-12** - 初始版本，包含所有核心功能文档

## 💬 获取帮助

如果在使用过程中遇到问题：

1. 查看相关文档的"常见问题"部分
2. 搜索项目的 Issue 列表
3. 在团队内部寻求帮助
4. 提交新的 Issue 描述问题

---

祝你使用愉快！🎉
