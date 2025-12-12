# 装饰器路由系统更新日志

## 版本 2.0.0 - 装饰器路由系统

### 🎉 新增功能

#### 1. 装饰器路由系统

引入了全新的基于装饰器的路由注册系统，提供更加现代化和易于维护的路由管理方式。

**核心装饰器：**
- `@Controller` - 定义控制器和路由前缀
- `@Get/@Post/@Put/@Patch/@Delete/@Options/@Head` - HTTP 方法装饰器
- `@UseMiddleware` - 应用中间件
- `@Auth` - 认证装饰器
- `@Public` - 公开路由标记

**示例：**
```typescript
@Controller('/users', {
  description: '用户管理接口',
})
export class UserController {
  @Auth()
  @Get('/')
  async list(req: Request, res: Response) {
    // 处理逻辑
  }
}
```

#### 2. 自动路由注册

路由会自动从装饰器元数据中提取并注册到 Express 应用，无需手动创建 Router 实例。

#### 3. 系统路由支持

支持系统路由（不添加 API 前缀），适用于健康检查、文档等系统级接口。

```typescript
@Controller('/health-check', {
  isSystemRoute: true,
})
export class HealthCheckController {}
```

#### 4. 类型安全

完整的 TypeScript 类型支持，编译时类型检查。

#### 5. 中间件支持

支持类级别和方法级别的中间件，灵活的中间件组合。

### 📁 新增文件

**核心文件：**
- `src/core/router/types.ts` - 类型定义
- `src/core/router/decorators.ts` - 核心装饰器实现
- `src/core/router/registry.ts` - 路由注册器
- `src/core/router/index.ts` - 导出接口
- `src/core/router/decorators/auth.decorators.ts` - 认证装饰器
- `src/core/router/decorators/index.ts` - 装饰器导出

**控制器文件：**
- `src/modules/auth/controllers/auth.controller.decorator.ts` - 认证控制器（装饰器版本）
- `src/modules/monitoring/healthCheck/healthCheck.controller.ts` - 健康检查控制器
- `src/modules/monitoring/swagger/swagger.controller.ts` - Swagger 控制器

**配置文件：**
- `src/controllers.ts` - 控制器自动加载

**文档文件：**
- `docs/decorator-routing.md` - 装饰器路由系统使用指南
- `docs/router.decorator.md` - 装饰器路由系统架构文档
- `docs/migration-guide.md` - 迁移指南
- `docs/CHANGELOG-decorator-routing.md` - 更新日志

**示例文件：**
- `examples/user.controller.example.ts` - 用户控制器示例

### 🔄 修改文件

- `src/core/config/routes.ts` - 更新为使用装饰器路由系统
- `src/server.ts` - 添加控制器导入
- `src/index.ts` - 添加 reflect-metadata 导入

### ✨ 改进

1. **代码组织**：路由定义和处理逻辑集中在控制器类中
2. **可读性**：声明式的路由定义，更加直观
3. **可维护性**：减少样板代码，易于维护
4. **扩展性**：易于添加自定义装饰器
5. **自动化**：自动路由注册和配置打印

### 📚 文档

新增了完整的文档：

1. **使用指南** (`docs/decorator-routing.md`)
   - 快速开始
   - 装饰器 API 详解
   - 完整示例
   - 最佳实践

2. **架构文档** (`docs/router.decorator.md`)
   - 系统架构
   - 工作原理
   - 数据流
   - 安全性考虑
   - 性能优化

3. **迁移指南** (`docs/migration-guide.md`)
   - 迁移步骤
   - 迁移对照表
   - 常见模式迁移
   - 常见问题

### 🔧 技术细节

**依赖：**
- `reflect-metadata` - 装饰器元数据支持（已安装）

**TypeScript 配置：**
- `experimentalDecorators: true` - 启用装饰器
- `emitDecoratorMetadata: true` - 发出装饰器元数据

**兼容性：**
- 与现有路由系统完全兼容
- 可以逐步迁移，新旧系统共存

### 🎯 使用方式

1. **创建控制器：**
```typescript
@Controller('/users')
export class UserController {
  @Get('/')
  async list(req: Request, res: Response) {}
}
```

2. **注册控制器：**
```typescript
// src/controllers.ts
import './modules/users/controllers/user.controller';
```

3. **启动应用：**
```bash
pnpm start:dev
```

### 📊 对比

| 特性 | 传统路由 | 装饰器路由 |
|------|---------|-----------|
| 路由定义 | 分散在多个文件 | 集中在控制器类 |
| 代码量 | 较多 | 较少 |
| 可读性 | 一般 | 优秀 |
| 维护性 | 一般 | 优秀 |
| 类型安全 | 部分支持 | 完全支持 |
| 自动化 | 低 | 高 |

### 🚀 下一步

建议的改进方向：

1. **参数装饰器**：`@Param()`, `@Query()`, `@Body()` 等
2. **验证装饰器**：集成数据验证库
3. **文档生成**：自动生成 OpenAPI/Swagger 文档
4. **依赖注入**：集成 DI 容器
5. **AOP 支持**：面向切面编程支持

### 📝 注意事项

1. **必须导入 reflect-metadata**：在 `src/index.ts` 最顶部导入
2. **必须注册控制器**：在 `src/controllers.ts` 中导入控制器类
3. **装饰器执行顺序**：从下到上，从右到左
4. **中间件执行顺序**：全局 → 控制器 → 方法 → 处理器

### 🐛 已知问题

无

### 🙏 致谢

感谢所有为这个功能做出贡献的开发者！

---

**发布日期：** 2024-12-12
**版本：** 2.0.0
**作者：** Kiro AI Assistant
