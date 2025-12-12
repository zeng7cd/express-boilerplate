# 装饰器路由系统架构

## 系统架构

装饰器路由系统由以下核心模块组成：

```
src/core/router/
├── types.ts              # 类型定义
├── decorators.ts         # 核心装饰器实现
├── registry.ts           # 路由注册器
├── index.ts              # 导出接口
└── decorators/
    ├── auth.decorators.ts    # 认证装饰器
    └── index.ts              # 装饰器导出
```

## 核心组件

### 1. 类型系统 (types.ts)

定义了路由系统的核心类型：

- `HttpMethod`: HTTP 方法类型
- `RouteMetadata`: 路由元数据
- `ControllerMetadata`: 控制器元数据
- `ControllerConstructor`: 控制器构造函数类型
- `METADATA_KEYS`: 元数据键常量

### 2. 装饰器 (decorators.ts)

提供核心装饰器实现：

- `@Controller`: 控制器装饰器
- `@Get/@Post/@Put/@Patch/@Delete/@Options/@Head`: HTTP 方法装饰器
- `@UseMiddleware`: 中间件装饰器
- 控制器注册表管理

### 3. 路由注册器 (registry.ts)

负责将装饰器标记的控制器注册到 Express 应用：

- `registerRoutes()`: 注册所有控制器路由
- `printRouteConfiguration()`: 打印路由配置信息

### 4. 认证装饰器 (decorators/auth.decorators.ts)

提供认证相关的便捷装饰器：

- `@Auth()`: 应用 JWT 认证中间件
- `@Public()`: 标记公开路由

## 工作原理

### 1. 装饰器注册阶段

```typescript
@Controller('/users')  // 1. 执行 Controller 装饰器
export class UserController {
  @Get('/')           // 2. 执行 Get 装饰器
  async getUsers() {} // 3. 收集路由元数据
}
```

当 TypeScript 编译并执行代码时：
1. `@Controller` 装饰器执行，创建控制器元数据
2. HTTP 方法装饰器执行，收集路由信息
3. 控制器被添加到全局注册表

### 2. 路由注册阶段

```typescript
// server.ts
async function createApp() {
  await import('@/controllers'); // 1. 导入所有控制器
  
  const app = express();
  setupRoutes(app);              // 2. 注册路由
}
```

注册流程：
1. 导入 `controllers.ts` 触发所有控制器的装饰器执行
2. `setupRoutes()` 调用 `registerRoutes()`
3. 遍历注册表中的所有控制器
4. 为每个控制器创建 Express Router
5. 将路由器挂载到应用

### 3. 元数据存储

使用 `reflect-metadata` 库存储装饰器元数据：

```typescript
// 存储控制器元数据
Reflect.defineMetadata(METADATA_KEYS.CONTROLLER, metadata, target);

// 读取控制器元数据
const metadata = Reflect.getMetadata(METADATA_KEYS.CONTROLLER, ControllerClass);
```

## 数据流

```
┌─────────────────┐
│  定义控制器      │
│  @Controller    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  定义路由方法    │
│  @Get/@Post等   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  导入控制器      │
│  controllers.ts │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  装饰器执行      │
│  收集元数据      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  注册到全局表    │
│  Registry       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  创建 Router     │
│  绑定处理器      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  挂载到 Express  │
│  app.use()      │
└─────────────────┘
```

## 安全性考虑

### 1. 中间件顺序

中间件按以下顺序执行，确保安全检查优先：

```
全局中间件 → 控制器中间件 → 方法中间件 → 路由处理器
```

### 2. 认证装饰器

`@Auth()` 装饰器确保只有认证用户才能访问：

```typescript
@Auth()
@Get('/profile')
async getProfile(req: Request, res: Response) {
  // req.user 已经过验证
}
```

### 3. 类型安全

TypeScript 提供编译时类型检查：

```typescript
// 类型错误会在编译时被捕获
@Get('/users')
async getUsers(req: Request, res: Response): Promise<void> {
  // 返回类型必须是 Promise<void>
}
```

## 可扩展性

### 1. 自定义装饰器

轻松创建自定义装饰器：

```typescript
export function RequireRole(...roles: string[]): MethodDecorator {
  const middleware: RequestHandler = (req, res, next) => {
    // 角色检查逻辑
  };
  return UseMiddleware(middleware);
}
```

### 2. 插件系统

可以扩展注册器以支持插件：

```typescript
export interface RouterPlugin {
  beforeRegister?(controller: ControllerConstructor): void;
  afterRegister?(controller: ControllerConstructor): void;
}
```

### 3. 元数据扩展

可以添加自定义元数据：

```typescript
const CUSTOM_KEY = Symbol('custom');

export function CustomDecorator(value: any): ClassDecorator {
  return (target: any) => {
    Reflect.defineMetadata(CUSTOM_KEY, value, target);
  };
}
```

## 性能优化

### 1. 懒加载

控制器在应用启动时一次性加载和注册，避免运行时开销。

### 2. 缓存

元数据在装饰器执行时收集并缓存，不需要重复解析。

### 3. 最小化反射

只在注册阶段使用反射，运行时直接调用绑定的处理器。

## 测试支持

### 1. 清空注册表

测试时可以清空控制器注册表：

```typescript
import { clearControllerRegistry } from '@/core/router/decorators';

beforeEach(() => {
  clearControllerRegistry();
});
```

### 2. 模拟控制器

可以轻松创建测试控制器：

```typescript
@Controller('/test')
class TestController {
  @Get('/')
  async test(req: Request, res: Response) {
    res.json({ test: true });
  }
}
```

## 与传统路由的对比

| 特性 | 传统路由 | 装饰器路由 |
|------|---------|-----------|
| 路由定义 | 分散在多个文件 | 集中在控制器类 |
| 类型安全 | 部分支持 | 完全支持 |
| 代码量 | 较多 | 较少 |
| 可读性 | 一般 | 优秀 |
| 维护性 | 一般 | 优秀 |
| 学习曲线 | 平缓 | 稍陡 |
| 灵活性 | 高 | 高 |
| 自动化 | 低 | 高 |

## 最佳实践

1. **控制器组织**：按功能域组织控制器
2. **路由命名**：使用 RESTful 风格的路由命名
3. **中间件复用**：将通用中间件提取为装饰器
4. **错误处理**：使用统一的错误处理中间件
5. **文档注释**：为控制器和路由添加详细注释
6. **类型定义**：充分利用 TypeScript 类型系统

## 未来扩展

可能的扩展方向：

1. **参数装饰器**：`@Param()`, `@Query()`, `@Body()` 等
2. **验证装饰器**：集成数据验证库
3. **文档生成**：自动生成 OpenAPI/Swagger 文档
4. **依赖注入**：集成 DI 容器
5. **AOP 支持**：面向切面编程支持
6. **GraphQL 支持**：支持 GraphQL 解析器装饰器

## 总结

装饰器路由系统提供了一种现代化、类型安全且易于维护的路由管理方案。通过合理的架构设计，系统在保持简洁性的同时，提供了强大的扩展能力和安全保障。
