/**
 * 事件类型定义
 */

/**
 * 用户事件
 */
export enum UserEvents {
  REGISTERED = 'user.registered',
  LOGIN = 'user.login',
  LOGOUT = 'user.logout',
  PASSWORD_CHANGED = 'user.password_changed',
  EMAIL_VERIFIED = 'user.email_verified',
  PROFILE_UPDATED = 'user.profile_updated',
}

/**
 * 认证事件
 */
export enum AuthEvents {
  TOKEN_GENERATED = 'auth.token_generated',
  TOKEN_REFRESHED = 'auth.token_refreshed',
  TOKEN_REVOKED = 'auth.token_revoked',
  LOGIN_FAILED = 'auth.login_failed',
}

/**
 * 系统事件
 */
export enum SystemEvents {
  APP_STARTED = 'system.app_started',
  APP_SHUTDOWN = 'system.app_shutdown',
  CACHE_CLEARED = 'system.cache_cleared',
  DATABASE_CONNECTED = 'system.database_connected',
}

/**
 * 用户注册事件数据
 */
export interface UserRegisteredEvent {
  userId: string;
  email: string;
  username: string;
  timestamp: Date;
}

/**
 * 用户登录事件数据
 */
export interface UserLoginEvent {
  userId: string;
  email: string;
  ip?: string;
  userAgent?: string;
  timestamp: Date;
}

/**
 * 用户登出事件数据
 */
export interface UserLogoutEvent {
  userId: string;
  timestamp: Date;
}

/**
 * 密码修改事件数据
 */
export interface PasswordChangedEvent {
  userId: string;
  timestamp: Date;
}
