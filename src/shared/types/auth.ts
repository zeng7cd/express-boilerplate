/**
 * 认证相关类型定义
 */

export interface JWTPayload {
  sub: string; // 用户ID
  email: string; // 用户邮箱
  username: string; // 用户名
  roles: string[]; // 用户角色
  permissions: string[]; // 用户权限
  iat: number; // 签发时间
  exp: number; // 过期时间
  jti: string; // Token ID
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
  roles: string[];
  permissions: string[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    username: string;
    roles: string[];
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

export interface RefreshTokenRequest {
  refreshToken: string;
}
