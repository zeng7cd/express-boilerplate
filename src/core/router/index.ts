/**
 * 路由注册器
 * 提供统一的路由管理和注册功能
 */
import type { Router } from 'express';
import { Router as ExpressRouter } from 'express';

interface RouteConfig {
  path: string;
  router: Router;
  description?: string;
}

interface RouteInfo {
  path: string;
  fullPath: string;
  description?: string;
}

/**
 * 路由注册器类
 * 单例模式管理所有路由的注册
 */
class RouteRegistry {
  private static instance: RouteRegistry;
  private readonly mainRouter: Router;
  private readonly prefix: string;
  private readonly routes = new Map<string, { router: Router; description?: string }>();

  private constructor(prefix: string) {
    this.prefix = prefix.startsWith('/') ? prefix : `/${prefix}`;
    this.mainRouter = ExpressRouter();
  }

  static getInstance(prefix = '/api'): RouteRegistry {
    if (!RouteRegistry.instance) {
      RouteRegistry.instance = new RouteRegistry(prefix);
    }
    return RouteRegistry.instance;
  }

  /**
   * 注册单个路由
   */
  register(path: string, router: Router, description?: string): void {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    
    if (this.routes.has(normalizedPath)) {
      console.warn(`⚠️ Route ${normalizedPath} already registered, overriding...`);
    }

    this.mainRouter.use(normalizedPath, router);
    this.routes.set(normalizedPath, { router, description });
  }

  /**
   * 批量注册路由
   */
  registerMultiple(configs: RouteConfig[]): void {
    configs.forEach(({ path, router, description }) => {
      this.register(path, router, description);
    });
  }

  /**
   * 获取主路由器
   */
  getRouter(): Router {
    return this.mainRouter;
  }

  /**
   * 获取完整路径
   */
  getFullPath(path: string): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.prefix}${normalizedPath}`;
  }

  /**
   * 获取已注册路由列表
   */
  getRoutes(): RouteInfo[] {
    return Array.from(this.routes.entries()).map(([path, { description }]) => ({
      path,
      fullPath: this.getFullPath(path),
      description,
    }));
  }

  /**
   * 打印路由信息
   */
  printRoutes(): void {
    const routes = this.getRoutes();
    
    if (routes.length === 0) {
      console.log('📋 No routes registered');
      return;
    }

    console.log('\n📋 Registered Routes:');
    console.log('='.repeat(60));
    routes.forEach(({ fullPath, description }) => {
      console.log(`  ${fullPath.padEnd(35)} ${description ? `- ${description}` : ''}`);
    });
    console.log('='.repeat(60) + '\n');
  }
}

// 导出单例实例和工具函数
export const routeRegistry = RouteRegistry.getInstance();

export const registerRoute = (path: string, router: Router, description?: string): void => {
  routeRegistry.register(path, router, description);
};

export const getApiPath = (path: string): string => {
  return routeRegistry.getFullPath(path);
};

export { RouteRegistry };
export type { RouteConfig, RouteInfo };
