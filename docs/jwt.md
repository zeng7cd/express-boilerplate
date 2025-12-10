# JWT 认证使用指南

本项目实现了完整的 JWT（JSON Web Token）认证系统，包括用户注册、登录、令牌刷新和登出功能。

## 📋 目录

- [简介](#简介)
- [认证流程](#认证流程)
- [快速开始](#快速开始)
- [JWT 服务](#jwt-服务)
- [认证中间件](#认证中间件)
- [API 端点](#api-端点)
- [安全特性](#安全特性)
- [最佳实践](#最佳实践)

## 简介

### 什么是 JWT？

JWT（JSON Web Token）是一种开放标准（RFC 7519），用于在各方之间安全地传输信息。它由三部分组成：

```
Header.Payload.Signature
```

- **Header**: 令牌类型和签名算法
- **Payload**: 用户信息和声明
- **Signature**: 签名，用于验证令牌的完整性

### 双令牌机制

本项目使用双令牌机制提高安全性：

- **Access Token（访问令牌）**: 短期有效（默认1小时），用于 API 访问
- **Refresh Token（刷新令牌）**: 长期有效（默认7天），用于获取新的访问令牌

## 认证流程

### 1. 用户注册流程

```
客户端                    服务器                    数据库
  |                        |                         |
  |--注册请求------------->|                         |
  |  (email, password)     |                         |
  |                        |--检查用户是否存在------>|
  |                        |<-----------------------|
  |                        |--加密密码--------------->|
  |                        |--创建用户--------------->|
  |                        |--分配默认角色---------->|
  |                        |<-----------------------|
  |<-注册成功--------------|                         |
  |  (user info)           |                         |
```

### 2. 用户登录流程

```
客户端                    服务器                    数据库/Redis
  |                        |                         |
  |--登录请求------------->|                         |
  |  (email, password)     |                         |
  |                        |--查询用户及权限-------->|
  |                        |<-----------------------|
  |                        |--验证密码--------------->|
  |                        |--生成 Access Token----->|
  |                        |--生成 Refresh Token---->|
  |                        |--保存会话--------------->|
  |<-返回令牌--------------|                         |
  |  (tokens, user info)   |                         |
```

### 3. 访问受保护资源

```
客户端                    服务器                    Redis
  |                        |                         |
  |--API 请求------------->|                         |
  |  (Authorization: Bearer token)                   |
  |                        |--验证令牌签名---------->|
  |                        |--检查令牌黑名单-------->|
  |                        |<-----------------------|
  |                        |--解析用户信息---------->|
  |                        |--执行业务逻辑---------->|
  |<-返回数据--------------|                         |
```

### 4. 刷新令牌流程

```
客户端                    服务器                    数据库
  |                        |                         |
  |--刷新请求------------->|                         |
  |  (refresh token)       |                         |
  |                        |--验证 Refresh Token---->|
  |                        |--查询会话--------------->|
  |                        |<-----------------------|
  |                        |--生成新 Access Token--->|
  |                        |--更新会话--------------->|
  |<-返回新令牌------------|                         |
  |  (new access token)    |                         |
```

## 快速开始

### 配置环境变量

```bash
# JWT 配置
JWT_SECRET=your-super-secret-jwt-key-min-64-chars-long-for-security
JWT_REFRESH_SECRET=your-super-secret-refresh-token-key-min-64-chars
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# 密码加密
BCRYPT_ROUNDS=12
```

⚠️ **安全提示**：
- JWT_SECRET 和 JWT_REFRESH_SECRET 必须不同
- 密钥长度至少 64 字符
- 生产环境使用强随机密钥

### 生成安全密钥

```bash
# 使用 Node.js 生成随机密钥
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## JWT 服务

### JWTService 类

位置：`src/modules/auth/services/jwt.service.ts`

#### 初始化

```typescript
import { JWTService } from '@/modules/auth/services/jwt.service';

const jwtService = new JWTService();
```

#### 生成访问令牌

```typescript
import { jwtService } from '@/modules/auth/services/jwt.service';

const user: AuthenticatedUser = {
  id: 'user-id',
  email: 'user@example.com',
  username: 'johndoe',
  roles: ['user'],
  permissions: ['read:profile', 'write:profile'],
};

const accessToken = jwtService.generateAccessToken(user);
```

**令牌载荷结构：**

```typescript
interface JWTPayload {
  sub: string;              // 用户 ID
  email: string;            // 邮箱
  username: string;         // 用户名
  roles: string[];          // 角色列表
  permissions: string[];    // 权限列表
  jti: string;              // 令牌唯一标识
  iat: number;              // 签发时间
  exp: number;              // 过期时间
}
```

#### 生成刷新令牌

```typescript
const refreshToken = jwtService.generateRefreshToken(userId);
```

#### 验证访问令牌

```typescript
try {
  const payload = jwtService.verifyAccessToken(token);
  console.log('User ID:', payload.sub);
  console.log('Roles:', payload.roles);
} catch (error) {
  console.error('Invalid token:', error.message);
}
```

#### 验证刷新令牌

```typescript
try {
  const { sub, jti } = jwtService.verifyRefreshToken(refreshToken);
  console.log('User ID:', sub);
  console.log('Token ID:', jti);
} catch (error) {
  console.error('Invalid refresh token:', error.message);
}
```

#### 解码令牌（不验证）

```typescript
const payload = jwtService.decodeToken(token);
if (payload) {
  console.log('Token expires at:', new Date(payload.exp * 1000));
}
```

#### 获取令牌过期时间

```typescript
const expiresIn = jwtService.getExpiresInSeconds();        // 访问令牌过期时间（秒）
const refreshExpiresIn = jwtService.getRefreshExpiresInSeconds(); // 刷新令牌过期时间（秒）
```

## 认证中间件

### authenticateJWT 中间件

位置：`src/shared/middleware/auth.middleware.ts`

用于保护需要认证的路由。

#### 基本使用

```typescript
import { Router } from 'express';
import { authenticateJWT } from '@/shared/middleware/auth.middleware';

const router = Router();

// 公开路由（无需认证）
router.get('/public', publicController.handle);

// 受保护路由（需要认证）
router.get('/profile', authenticateJWT, profileController.handle);
router.post('/update', authenticateJWT, profileController.update);
```

#### 中间件工作流程

```typescript
export const authenticateJWT = async (req: Request, res: Response, next: NextFunction) => {
  // 1. 从请求头获取令牌
  const token = extractTokenFromHeader(req);
  
  // 2. 检查令牌是否存在
  if (!token) {
    throw new UnauthorizedException('No token provided');
  }
  
  // 3. 检查令牌是否在黑名单中
  const isBlacklisted = await tokenBlacklistService.isBlacklisted(token);
  if (isBlacklisted) {
    throw new UnauthorizedException('Token has been revoked');
  }
  
  // 4. 验证令牌
  const payload = jwtService.verifyAccessToken(token);
  
  // 5. 将用户信息附加到请求对象
  req.user = {
    id: payload.sub,
    email: payload.email,
    username: payload.username,
    roles: payload.roles,
    permissions: payload.permissions,
  };
  
  next();
};
```

#### 在控制器中使用

```typescript
import { Request, Response } from 'express';

export class ProfileController {
  async getProfile(req: Request, res: Response) {
    // req.user 由 authenticateJWT 中间件注入
    const userId = req.user!.id;
    const userEmail = req.user!.email;
    
    const profile = await profileService.getProfile(userId);
    
    res.json({
      success: true,
      data: profile,
    });
  }
}
```

### 角色和权限中间件

#### requireRole - 要求特定角色

```typescript
import { requireRole } from '@/shared/middleware/role.middleware';

// 只允许管理员访问
router.delete('/users/:id', 
  authenticateJWT, 
  requireRole('admin'), 
  userController.delete
);

// 允许多个角色
router.get('/dashboard', 
  authenticateJWT, 
  requireRole(['admin', 'moderator']), 
  dashboardController.show
);
```

#### requirePermission - 要求特定权限

```typescript
import { requirePermission } from '@/shared/middleware/permission.middleware';

// 要求特定权限
router.post('/posts', 
  authenticateJWT, 
  requirePermission('create:post'), 
  postController.create
);

// 要求多个权限（AND）
router.delete('/posts/:id', 
  authenticateJWT, 
  requirePermission(['delete:post', 'moderate:content']), 
  postController.delete
);
```

## API 端点

### 用户注册

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**响应：**

```json
{
  "success": true,
  "data": {
    "id": "clx1234567890",
    "email": "user@example.com",
    "username": "johndoe"
  },
  "message": "User registered successfully"
}
```

### 用户登录

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**响应：**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "clx1234567890",
      "email": "user@example.com",
      "username": "johndoe",
      "roles": ["user"]
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 3600
    }
  }
}
```

### 刷新令牌

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**响应：**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600
  }
}
```

### 获取当前用户信息

```http
GET /api/auth/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**响应：**

```json
{
  "success": true,
  "data": {
    "id": "clx1234567890",
    "email": "user@example.com",
    "username": "johndoe",
    "firstName": "John",
    "lastName": "Doe",
    "roles": ["user"],
    "permissions": ["read:profile", "write:profile"]
  }
}
```

### 用户登出

```http
POST /api/auth/logout
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**响应：**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

## 安全特性

### 1. 令牌黑名单

登出时将令牌加入黑名单，防止被继续使用。

```typescript
// src/core/services/token-blacklist.service.ts
class TokenBlacklistService {
  // 将令牌加入黑名单
  async addToBlacklist(token: string): Promise<void> {
    const payload = jwtService.decodeToken(token);
    if (!payload) return;
    
    const ttl = payload.exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) {
      await cacheService.set(`blacklist:${token}`, '1', ttl);
    }
  }
  
  // 检查令牌是否在黑名单中
  async isBlacklisted(token: string): Promise<boolean> {
    const result = await cacheService.get(`blacklist:${token}`);
    return result !== null;
  }
  
  // 撤销用户的所有令牌
  async blacklistUserTokens(userId: string, ttl: number): Promise<void> {
    await cacheService.set(`blacklist:user:${userId}`, '1', ttl);
  }
}
```

### 2. 密码加密

使用 bcrypt 加密密码，防止明文存储。

```typescript
import bcrypt from 'bcryptjs';

// 加密密码
const hashedPassword = await bcrypt.hash(password, env.BCRYPT_ROUNDS);

// 验证密码
const isValid = await bcrypt.compare(inputPassword, hashedPassword);
```

### 3. 会话管理

在数据库中记录活跃会话，支持会话撤销。

```typescript
// 保存会话
await db.insert(sessions).values({
  userId: user.id,
  token: accessToken,
  refreshToken,
  expiresAt: new Date(Date.now() + expiresIn * 1000),
});

// 验证会话
const session = await db.query.sessions.findFirst({
  where: and(
    eq(sessions.token, token),
    gt(sessions.expiresAt, new Date())
  ),
});
```

### 4. 令牌唯一标识（JTI）

每个令牌都有唯一的 JTI，用于追踪和撤销。

```typescript
import { nanoid } from 'nanoid';

const payload = {
  sub: userId,
  jti: nanoid(),  // 唯一标识
  // ...
};
```

### 5. 双密钥机制

访问令牌和刷新令牌使用不同的密钥签名。

```typescript
// 访问令牌
const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

// 刷新令牌
const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
```

## 最佳实践

### 1. 客户端令牌存储

```typescript
// ✅ 推荐：使用 httpOnly Cookie（服务端设置）
res.cookie('accessToken', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 3600000,
});

// ⚠️ 可接受：localStorage（注意 XSS 风险）
localStorage.setItem('accessToken', token);

// ❌ 避免：sessionStorage（页面关闭后丢失）
```

### 2. 令牌刷新策略

```typescript
// 客户端自动刷新令牌
class AuthService {
  private refreshTokenTimeout?: NodeJS.Timeout;
  
  async login(email: string, password: string) {
    const response = await api.post('/auth/login', { email, password });
    const { accessToken, refreshToken, expiresIn } = response.data.tokens;
    
    // 保存令牌
    this.setTokens(accessToken, refreshToken);
    
    // 在令牌过期前5分钟刷新
    this.scheduleTokenRefresh(expiresIn - 300);
  }
  
  private scheduleTokenRefresh(delay: number) {
    this.refreshTokenTimeout = setTimeout(async () => {
      await this.refreshToken();
    }, delay * 1000);
  }
  
  private async refreshToken() {
    const refreshToken = this.getRefreshToken();
    const response = await api.post('/auth/refresh', { refreshToken });
    const { accessToken, expiresIn } = response.data;
    
    this.setAccessToken(accessToken);
    this.scheduleTokenRefresh(expiresIn - 300);
  }
}
```

### 3. 请求拦截器

```typescript
// Axios 拦截器自动添加令牌
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8080/api',
});

// 请求拦截器
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器（处理令牌过期）
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // 令牌过期，尝试刷新
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await axios.post('/auth/refresh', { refreshToken });
        const { accessToken } = response.data;
        
        localStorage.setItem('accessToken', accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        
        return api(originalRequest);
      } catch (refreshError) {
        // 刷新失败，跳转到登录页
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);
```

### 4. 令牌过期处理

```typescript
// 服务端检查令牌过期
export const authenticateJWT = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = extractTokenFromHeader(req);
    const payload = jwtService.verifyAccessToken(token);
    
    // 检查令牌是否即将过期（剩余时间少于5分钟）
    const expiresIn = payload.exp - Math.floor(Date.now() / 1000);
    if (expiresIn < 300) {
      res.setHeader('X-Token-Expiring', 'true');
    }
    
    req.user = payload;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new UnauthorizedException('Token expired');
    }
    throw new UnauthorizedException('Invalid token');
  }
};
```

### 5. 多设备登录管理

```typescript
// 限制同时登录的设备数量
class AuthService {
  async login(data: LoginRequest, deviceInfo: DeviceInfo) {
    // 查询用户的活跃会话
    const activeSessions = await db.query.sessions.findMany({
      where: and(
        eq(sessions.userId, user.id),
        gt(sessions.expiresAt, new Date())
      ),
    });
    
    // 限制最多5个设备同时登录
    if (activeSessions.length >= 5) {
      // 删除最旧的会话
      const oldestSession = activeSessions[0];
      await db.delete(sessions).where(eq(sessions.id, oldestSession.id));
      await tokenBlacklistService.addToBlacklist(oldestSession.token);
    }
    
    // 创建新会话
    // ...
  }
}
```

### 6. 安全的密码策略

```typescript
import { z } from 'zod';

// 密码验证规则
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must not exceed 100 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');
```

### 7. 防止暴力破解

```typescript
import rateLimit from 'express-rate-limit';

// 登录接口限流
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 5, // 最多5次尝试
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', loginLimiter, authController.login);
```

### 8. 审计日志

```typescript
// 记录认证相关操作
class AuthService {
  async login(data: LoginRequest, req: Request) {
    const logger = getLogger().child({ module: 'AuthService' });
    
    try {
      const result = await this.performLogin(data);
      
      // 记录成功登录
      logger.info('User logged in', {
        userId: result.user.id,
        email: result.user.email,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
      
      return result;
    } catch (error) {
      // 记录失败尝试
      logger.warn('Login failed', {
        email: data.email,
        ip: req.ip,
        reason: error.message,
      });
      
      throw error;
    }
  }
}
```

## 常见问题

### Q: 如何处理令牌过期？

A: 使用刷新令牌获取新的访问令牌：

```typescript
// 客户端检测到401错误时
if (error.response.status === 401) {
  const newToken = await refreshAccessToken();
  // 重试原请求
}
```

### Q: 如何撤销所有设备的登录？

A: 调用登出所有设备接口：

```typescript
await authService.logoutAllDevices(userId);
```

### Q: 如何实现"记住我"功能？

A: 使用更长的刷新令牌过期时间：

```typescript
const refreshExpiresIn = rememberMe ? '30d' : '7d';
```

### Q: 如何在微服务架构中共享认证？

A: 使用共享的 JWT 密钥和 Redis，或使用 API Gateway 统一认证。

### Q: 如何防止 CSRF 攻击？

A: 使用 httpOnly Cookie + CSRF Token：

```typescript
// 设置 CSRF Token
res.cookie('csrfToken', csrfToken, { httpOnly: false });

// 验证 CSRF Token
if (req.headers['x-csrf-token'] !== req.cookies.csrfToken) {
  throw new ForbiddenException('Invalid CSRF token');
}
```

## 相关资源

- [JWT 官方网站](https://jwt.io/)
- [RFC 7519 - JWT 规范](https://tools.ietf.org/html/rfc7519)
- [OWASP 认证备忘单](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [jsonwebtoken 文档](https://github.com/auth0/node-jsonwebtoken)
