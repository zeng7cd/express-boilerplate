/**
 * 路由注册器
 * 负责将装饰器标记的控制器注册到 Express 应用
 */
import 'reflect-metadata';
import { Router as ExpressRouter } from 'express';

import { env } from '@/core/config/env';
import { getAppPinoLogger } from '@/core/logger/pino';
import { createStrictRateLimiter } from '@/shared/middleware/security';
import { validate } from '@/shared/middleware/validation';

import { getRegisteredControllers } from './decorators';
import { RATE_LIMIT_METADATA_KEY } from './decorators/rateLimit.decorator';
import { VALIDATE_METADATA_KEY } from './decorators/validate.decorator';
import { METADATA_KEYS } from './types';

import type { RateLimitOptions } from './decorators/rateLimit.decorator';
import type { ControllerMetadata } from './types';
import type { Application, Router, Request, Response, NextFunction } from 'express';

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

  controllers.forEach((ControllerClass) => {
    const router = createRouterForController(ControllerClass);
    if (router) {
      mountRouter(app, ControllerClass, router, result);
    }
  });

  return result;
}

/**
 * 为控制器创建路由器
 */
function createRouterForController(ControllerClass: any): Router | null {
  const metadata: ControllerMetadata = Reflect.getMetadata(METADATA_KEYS.CONTROLLER, ControllerClass);

  if (!metadata) {
    logger.warn({ controller: ControllerClass.name }, 'Controller metadata not found');
    return null;
  }

  const controllerInstance = new ControllerClass();
  const router: Router = ExpressRouter();
  const routes = Reflect.getMetadata(METADATA_KEYS.ROUTES, controllerInstance) || [];

  routes.forEach((route: any) => {
    registerRoute(router, controllerInstance, route, metadata);
  });

  return router;
}

/**
 * 注册单个路由
 */
function registerRoute(router: Router, controllerInstance: any, route: any, metadata: ControllerMetadata): void {
  const handler = controllerInstance[route.handlerName];

  if (typeof handler !== 'function') {
    logger.warn(
      { controller: controllerInstance.constructor.name, handler: route.handlerName },
      'Handler is not a function',
    );
    return;
  }

  const middlewares = buildMiddlewares(controllerInstance, route, metadata);
  const wrappedHandler = wrapHandler(handler, controllerInstance);

  (router as any)[route.method](route.path, ...middlewares, wrappedHandler);

  logger.debug(
    {
      method: route.method.toUpperCase(),
      path: `${metadata.prefix}${route.path}`,
      middlewares: middlewares.length,
      description: route.description,
    },
    'Route registered',
  );
}

/**
 * 构建中间件数组
 */
function buildMiddlewares(controllerInstance: any, route: any, metadata: ControllerMetadata): any[] {
  const validationSchema = Reflect.getMetadata(VALIDATE_METADATA_KEY, controllerInstance, route.handlerName);
  const validationMiddlewares = validationSchema ? [validate(validationSchema)] : [];

  const rateLimitOptions: RateLimitOptions | undefined = Reflect.getMetadata(
    RATE_LIMIT_METADATA_KEY,
    controllerInstance,
    route.handlerName,
  );
  const rateLimitMiddlewares = rateLimitOptions
    ? [createStrictRateLimiter(rateLimitOptions.windowMs, rateLimitOptions.max, rateLimitOptions.message)]
    : [];

  return [...rateLimitMiddlewares, ...validationMiddlewares, ...metadata.middlewares, ...route.middlewares];
}

/**
 * 包装处理器以自动捕获异步错误
 */
function wrapHandler(handler: (...args: any[]) => any, controllerInstance: any) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await handler.call(controllerInstance, req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

/**
 * 挂载路由器到应用
 */
function mountRouter(app: Application, ControllerClass: any, router: Router, result: RouteRegistrationResult): void {
  const metadata: ControllerMetadata = Reflect.getMetadata(METADATA_KEYS.CONTROLLER, ControllerClass);
  const apiPrefix = `/${env.API_PREFIX}`;
  const fullPath = metadata.isSystemRoute ? metadata.prefix : `${apiPrefix}${metadata.prefix}`;

  app.use(fullPath, router);

  const routeInfo = {
    path: fullPath,
    description: metadata.description,
  };

  if (metadata.isSystemRoute) {
    result.systemRoutes.push(routeInfo);
  } else {
    result.apiRoutes.push(routeInfo);
  }
}


