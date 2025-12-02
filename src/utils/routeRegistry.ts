import type { Router } from 'express';
import * as express from 'express';
import { env } from '@/config/envConfig';

interface RouteInfo {
  path: string;
  fullPath: string;
  description?: string;
}

interface RouteConfig {
  path: string;
  router: Router;
  description?: string;
}

/**
 * 路由注册器
 * 单例模式管理所有API路由的注册和配置
 */
export class RouteRegistry {
  private static instance: RouteRegistry;
  private readonly mainRouter: Router;
  private prefix: string;
  private readonly registeredRoutes = new Map<string, { router: Router; description?: string }>();

  private constructor(prefix = '/api') {
    this.prefix = this.normalizePath(prefix);
    this.mainRouter = express.Router();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(prefix?: string): RouteRegistry {
    if (!RouteRegistry.instance) {
      RouteRegistry.instance = new RouteRegistry(prefix);
    }
    return RouteRegistry.instance;
  }

  /**
   * 规范化路径格式
   */
  private normalizePath(path: string): string {
    return path.startsWith('/') ? path : `/${path}`;
  }

  /**
   * 注册路由模块
   * @param modulePath 模块路径
   * @param router Express路由器
   * @param description 路由描述
   */
  public register(modulePath: string, router: Router, description?: string): void {
    const normalizedPath = this.normalizePath(modulePath);

    if (this.registeredRoutes.has(normalizedPath)) {
      console.warn(`⚠️ Route ${normalizedPath} already exists, overriding...`);
    }

    this.mainRouter.use(normalizedPath, router);
    this.registeredRoutes.set(normalizedPath, { router, description });
  }

  /**
   * 批量注册路由
   */
  public registerMultiple(routes: RouteConfig[]): void {
    for (const { path, router, description } of routes) {
      this.register(path, router, description);
    }
  }

  /**
   * 获取主路由器
   */
  public getRouter(): Router {
    return this.mainRouter;
  }

  /**
   * 获取API前缀
   */
  public getPrefix(): string {
    return this.prefix;
  }

  /**
   * 获取完整API路径
   */
  public getFullPath(modulePath: string): string {
    const normalizedPath = this.normalizePath(modulePath);
    return `${this.prefix}${normalizedPath}`;
  }

  /**
   * 获取已注册的路由信息
   */
  public getRegisteredRoutes(): RouteInfo[] {
    return Array.from(this.registeredRoutes.entries()).map(([path, { description }]) => ({
      path,
      fullPath: this.getFullPath(path),
      description,
    }));
  }

  /**
   * 打印所有已注册的路由
   */
  public printRoutes(): void {
    const routes = this.getRegisteredRoutes();

    if (routes.length === 0) {
      console.log('📋 No routes registered');
      return;
    }

    console.log('\n📋 Registered API Routes:');
    console.log('='.repeat(50));

    for (const { fullPath, description } of routes) {
      console.log(`  ${fullPath}${description ? ` - ${description}` : ''}`);
    }

    console.log(`${'='.repeat(50)}\n`);
  }

  /**
   * 移除已注册的路由（开发环境使用）
   */
  public unregister(modulePath: string): boolean {
    const normalizedPath = this.normalizePath(modulePath);

    if (this.registeredRoutes.has(normalizedPath)) {
      this.registeredRoutes.delete(normalizedPath);
      console.log(`✓ Unregistered route: ${this.prefix}${normalizedPath}`);
      return true;
    }

    console.warn(`⚠️ Route ${normalizedPath} not found for unregistration`);
    return false;
  }

  /**
   * 动态设置API前缀
   */
  public setPrefix(prefix: string): void {
    this.prefix = this.normalizePath(prefix);
  }

  /**
   * 获取路由统计信息
   */
  public getStats(): { total: number; prefix: string } {
    return {
      total: this.registeredRoutes.size,
      prefix: this.prefix,
    };
  }
}

/**
 * 获取环境配置的API前缀
 */
function getEnvPrefix(): string {
  try {
    return `/${env.API_PREFIX}`;
  } catch {
    return '/api';
  }
}

// 导出全局路由注册器实例
export const routeRegistry = RouteRegistry.getInstance(getEnvPrefix());

/**
 * 便利函数：注册路由
 */
export const registerRoute = (path: string, router: Router, description?: string): void => {
  routeRegistry.register(path, router, description);
};

/**
 * 便利函数：获取完整API路径
 */
export const getApiPath = (path: string): string => {
  return routeRegistry.getFullPath(path);
};
