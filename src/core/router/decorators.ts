/**
 * 路由装饰器
 * 提供基于装饰器的路由注册功能
 */
import 'reflect-metadata';
import { METADATA_KEYS } from './types';

import type { ControllerMetadata, HttpMethod, RouteMetadata, ControllerConstructor } from './types';
import type { RequestHandler } from 'express';

/**
 * 控制器装饰器
 * @param prefix - 路由前缀
 * @param options - 配置选项
 */
export function Controller(
  prefix: string,
  options?: {
    middlewares?: RequestHandler[];
    description?: string;
    isSystemRoute?: boolean;
  },
): ClassDecorator {
  return (target: object) => {
    const metadata: ControllerMetadata = {
      prefix,
      middlewares: options?.middlewares || [],
      routes: [],
      description: options?.description,
      isSystemRoute: options?.isSystemRoute || false,
    };

    Reflect.defineMetadata(METADATA_KEYS.CONTROLLER, metadata, target);

    // 注册控制器到全局注册表
    registerController(target as ControllerConstructor);
  };
}

/**
 * 创建路由方法装饰器
 */
function createRouteDecorator(method: HttpMethod) {
  return (
    path: string,
    options?: {
      middlewares?: RequestHandler[];
      description?: string;
    },
  ): MethodDecorator => {
    return (target: object, propertyKey: string | symbol) => {
      const routes: RouteMetadata[] = Reflect.getMetadata(METADATA_KEYS.ROUTES, target) || [];

      const route: RouteMetadata = {
        method,
        path,
        middlewares: options?.middlewares || [],
        handlerName: propertyKey as string,
        description: options?.description,
      };

      routes.push(route);
      Reflect.defineMetadata(METADATA_KEYS.ROUTES, routes, target);
    };
  };
}

/**
 * HTTP 方法装饰器
 */
export const Get = createRouteDecorator('get');
export const Post = createRouteDecorator('post');
export const Put = createRouteDecorator('put');
export const Patch = createRouteDecorator('patch');
export const Delete = createRouteDecorator('delete');
export const Options = createRouteDecorator('options');
export const Head = createRouteDecorator('head');

/**
 * 中间件装饰器
 * 可用于类或方法
 */
export function UseMiddleware(...middlewares: RequestHandler[]): ClassDecorator & MethodDecorator {
  return (target: object, propertyKey?: string | symbol) => {
    if (propertyKey) {
      // 方法装饰器
      const routes: RouteMetadata[] = Reflect.getMetadata(METADATA_KEYS.ROUTES, target) || [];
      const route = routes.find((r) => r.handlerName === propertyKey);
      if (route) {
        route.middlewares = [...middlewares, ...route.middlewares];
      }
    } else {
      // 类装饰器
      const metadata: ControllerMetadata = Reflect.getMetadata(METADATA_KEYS.CONTROLLER, target);
      if (metadata) {
        metadata.middlewares = [...middlewares, ...metadata.middlewares];
      }
    }
  };
}

/**
 * 全局控制器注册表
 */
const controllerRegistry: Set<ControllerConstructor> = new Set();

/**
 * 注册控制器
 */
function registerController(controller: ControllerConstructor): void {
  controllerRegistry.add(controller);
}

/**
 * 获取所有注册的控制器
 */
export function getRegisteredControllers(): ControllerConstructor[] {
  return Array.from(controllerRegistry);
}

/**
 * 清空控制器注册表（用于测试）
 */
export function clearControllerRegistry(): void {
  controllerRegistry.clear();
}
