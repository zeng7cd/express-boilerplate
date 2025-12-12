/**
 * 路由注册器
 * 负责将装饰器标记的控制器注册到 Express 应用
 */
import 'reflect-metadata';
import type { Application, Router } from 'express';
import { Router as ExpressRouter } from 'express';
import type { ControllerMetadata } from './types';
import { METADATA_KEYS } from './types';
import { getRegisteredControllers } from './decorators';
import { getAppPinoLogger } from '@/core/logger/pino';
import { env } from '@/core/config/env';

const logger = getAppPinoLogger();

/**
 * 路由注册结果
 */
interface RouteRegistrationResult {
  apiRoutes: { path: string; description?: string }[];
  systemRoutes: { path: string; description?: string }[];
}

/**
 * 注册所有控制器路由
 */
export function registerRoutes(app: Application): RouteRegistrationResult {
  const controllers = getRegisteredControllers();
  const result: RouteRegistrationResult = {
    apiRoutes: [],
    systemRoutes: [],
  };

  const apiPrefix = `/${env.API_PREFIX}`;

  for (const ControllerClass of controllers) {
    const metadata: ControllerMetadata = Reflect.getMetadata(METADATA_KEYS.CONTROLLER, ControllerClass);

    if (!metadata) {
      logger.warn({ controller: ControllerClass.name }, 'Controller metadata not found');
      continue;
    }

    // 创建控制器实例
    const controllerInstance = new ControllerClass();

    // 创建路由器
    const router: Router = ExpressRouter();

    // 获取控制器原型上的路由元数据
    const routes = Reflect.getMetadata(METADATA_KEYS.ROUTES, controllerInstance) || [];

    // 注册路由
    for (const route of routes) {
      const handler = controllerInstance[route.handlerName];

      if (typeof handler !== 'function') {
        logger.warn({ controller: ControllerClass.name, handler: route.handlerName }, 'Handler is not a function');
        continue;
      }

      // 合并控制器和路由级别的中间件
      const allMiddlewares = [...metadata.middlewares, ...route.middlewares];

      // 绑定处理器到控制器实例
      const boundHandler = handler.bind(controllerInstance);

      // 注册路由
      (router as any)[route.method](route.path, ...allMiddlewares, boundHandler);

      logger.debug(
        {
          method: route.method.toUpperCase(),
          path: `${metadata.prefix}${route.path}`,
          middlewares: allMiddlewares.length,
          description: route.description,
        },
        'Route registered',
      );
    }

    // 将路由器挂载到应用
    const fullPath = metadata.isSystemRoute ? metadata.prefix : `${apiPrefix}${metadata.prefix}`;
    app.use(fullPath, router);

    // 记录注册结果
    const routeInfo = {
      path: fullPath,
      description: metadata.description,
    };

    if (metadata.isSystemRoute) {
      result.systemRoutes.push(routeInfo);
    } else {
      result.apiRoutes.push(routeInfo);
    }

    logger.info(
      {
        controller: ControllerClass.name,
        prefix: fullPath,
        routeCount: routes.length,
        isSystemRoute: metadata.isSystemRoute,
      },
      'Controller registered',
    );
  }

  return result;
}

/**
 * 打印路由配置信息
 */
export function printRouteConfiguration(result: RouteRegistrationResult): void {
  console.log('\n📋 Route Configuration:');
  console.log('='.repeat(60));

  if (result.systemRoutes.length > 0) {
    console.log('\n🔧 System Routes:');
    result.systemRoutes.forEach(({ path, description }) => {
      console.log(`  ${path.padEnd(30)} - ${description || 'N/A'}`);
    });
  }

  if (result.apiRoutes.length > 0) {
    console.log(`\n🌐 API Routes (prefix: /${env.API_PREFIX}):`);
    result.apiRoutes.forEach(({ path, description }) => {
      console.log(`  ${path.padEnd(30)} - ${description || 'N/A'}`);
    });
  }

  console.log(`\n${'='.repeat(60)}\n`);
}
