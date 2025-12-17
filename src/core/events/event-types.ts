/**
 * 事件类型定义
 * 提供类型安全的事件映射
 */

// 用户相关事件
export interface UserRegisteredEvent {
  userId: string;
  email: string;
  username: string;
  timestamp: Date;
}

export interface UserLoginEvent {
  userId: string;
  email: string;
  ip?: string;
  userAgent?: string;
  timestamp: Date;
}

export interface UserLogoutEvent {
  userId: string;
  timestamp: Date;
}

export interface UserUpdatedEvent {
  userId: string;
  changes: Record<string, any>;
  timestamp: Date;
}

export interface UserDeletedEvent {
  userId: string;
  timestamp: Date;
}

// 认证相关事件
export interface PasswordChangedEvent {
  userId: string;
  timestamp: Date;
}

export interface TokenRefreshedEvent {
  userId: string;
  timestamp: Date;
}

// 系统事件
export interface SystemErrorEvent {
  error: Error;
  context?: Record<string, any>;
  timestamp: Date;
}

/**
 * 事件映射表
 * 定义所有可用的事件及其数据类型
 */
export interface EventMap {
  'user.registered': UserRegisteredEvent;
  'user.login': UserLoginEvent;
  'user.logout': UserLogoutEvent;
  'user.updated': UserUpdatedEvent;
  'user.deleted': UserDeletedEvent;
  'auth.password.changed': PasswordChangedEvent;
  'auth.token.refreshed': TokenRefreshedEvent;
  'system.error': SystemErrorEvent;
}

/**
 * 事件名称类型
 */
export type EventName = keyof EventMap;

/**
 * 用户事件常量
 */
export const UserEvents = {
  REGISTERED: 'user.registered' as const,
  LOGIN: 'user.login' as const,
  LOGOUT: 'user.logout' as const,
  UPDATED: 'user.updated' as const,
  DELETED: 'user.deleted' as const,
} as const;
