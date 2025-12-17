/**
 * 认证控制器
 */
import { getAppPinoLogger } from '@/core/logger/pino';
import { Controller, Post, Get, Auth, Public, Validate, RateLimit } from '@/core/router';
import type { LoginRequest, RegisterRequest, RefreshTokenRequest } from '@/shared/types/auth';
import { ServiceResponse } from '@/shared/utils/serviceResponse';

import { loginSchema, registerSchema } from '../schemas';
import { authService } from '../services/auth.service';

import type { Request, Response } from 'express';

const logger = getAppPinoLogger();

@Controller('/auth', {
  description: '认证相关接口',
})
export class AuthController {
  /**
   * 用户注册
   * 限流: 每小时最多 3 次注册尝试
   */
  @Public()
  @RateLimit({
    windowMs: 60 * 60 * 1000, // 1 小时
    max: 3, // 3 次
    message: 'Too many registration attempts, please try again later',
  })
  @Validate(registerSchema)
  @Post('/register', {
    description: '用户注册',
  })
  async register(req: Request, res: Response): Promise<void> {
    const data: RegisterRequest = req.body;

    const user = await authService.register(data);

    logger.info({ userId: user.id, email: user.email }, 'User registered successfully');

    const response = ServiceResponse.success('User registered successfully', user, 201);
    res.status(response.statusCode).json(response);
  }

  /**
   * 用户登录
   * 限流: 每 15 分钟最多 5 次登录尝试
   */
  @Public()
  @RateLimit({
    windowMs: 15 * 60 * 1000, // 15 分钟
    max: 5, // 5 次
    message: 'Too many login attempts, please try again later',
  })
  @Validate(loginSchema)
  @Post('/login', {
    description: '用户登录',
  })
  async login(req: Request, res: Response): Promise<void> {
    const data: LoginRequest = req.body;

    const result = await authService.login(data);

    logger.info(
      {
        userId: result.user.id,
        email: result.user.email,
      },
      'User logged in successfully',
    );

    const response = ServiceResponse.success('Login successful', result);
    res.status(response.statusCode).json(response);
  }

  /**
   * 刷新令牌
   */
  @Public()
  @RateLimit({
    windowMs: 15 * 60 * 1000, // 15 分钟
    max: 10, // 10 次
    message: 'Too many token refresh attempts',
  })
  @Post('/refresh', {
    description: '刷新访问令牌',
  })
  async refreshToken(req: Request, res: Response): Promise<void> {
    const { refreshToken }: RefreshTokenRequest = req.body;

    const result = await authService.refreshToken(refreshToken);

    logger.info('Token refreshed successfully');

    const response = ServiceResponse.success('Token refreshed successfully', result);
    res.status(response.statusCode).json(response);
  }

  /**
   * 用户登出
   */
  @Auth()
  @Post('/logout', {
    description: '用户登出',
  })
  async logout(req: Request, res: Response): Promise<void> {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (token) {
      await authService.logout(token);
      logger.info({ userId: req.user?.sub }, 'User logged out successfully');
    }

    const response = ServiceResponse.success('Logout successful', null);
    res.status(response.statusCode).json(response);
  }

  /**
   * 获取当前用户信息
   */
  @Auth()
  @Get('/me', {
    description: '获取当前用户信息',
  })
  async me(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      const response = ServiceResponse.failure('Authentication required', null, 401);
      res.status(response.statusCode).json(response);
      return;
    }

    const response = ServiceResponse.success('User information retrieved successfully', {
      id: req.user.sub,
      email: req.user.email,
      username: req.user.username,
      roles: req.user.roles,
      permissions: req.user.permissions,
    });
    res.status(response.statusCode).json(response);
  }
}
