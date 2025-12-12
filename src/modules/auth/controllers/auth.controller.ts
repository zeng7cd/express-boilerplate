/**
 * 认证控制器
 */
import type { Request, Response } from 'express';
import { Controller, Post, Get, Auth, Public } from '@/core/router';
import { authService } from '../services/auth.service';
import { getLogger } from '@/core/logger';
import type { LoginRequest, RegisterRequest, RefreshTokenRequest } from '@/shared/types/auth';

const logger = getLogger();

@Controller('/auth', {
  description: '认证相关接口',
})
export class AuthController {
  /**
   * 用户注册
   */
  @Public()
  @Post('/register', {
    description: '用户注册',
  })
  async register(req: Request, res: Response): Promise<void> {
    try {
      const data: RegisterRequest = req.body;

      const user = await authService.register(data);

      logger.info('User registered successfully', { userId: user.id, email: user.email });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: user,
      });
    } catch (error) {
      logger.error('Registration failed', error as Error, { email: req.body.email });

      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Registration failed',
      });
    }
  }

  /**
   * 用户登录
   */
  @Public()
  @Post('/login', {
    description: '用户登录',
  })
  async login(req: Request, res: Response): Promise<void> {
    try {
      const data: LoginRequest = req.body;

      const result = await authService.login(data);

      logger.info('User logged in successfully', {
        userId: result.user.id,
        email: result.user.email,
      });

      res.json({
        success: true,
        message: 'Login successful',
        data: result,
      });
    } catch (error) {
      logger.error('Login failed', error as Error, { email: req.body.email });

      res.status(401).json({
        success: false,
        message: error instanceof Error ? error.message : 'Login failed',
      });
    }
  }

  /**
   * 刷新令牌
   */
  @Public()
  @Post('/refresh', {
    description: '刷新访问令牌',
  })
  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken }: RefreshTokenRequest = req.body;

      const result = await authService.refreshToken(refreshToken);

      logger.info('Token refreshed successfully');

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Token refresh failed', error as Error);

      res.status(401).json({
        success: false,
        message: error instanceof Error ? error.message : 'Token refresh failed',
      });
    }
  }

  /**
   * 用户登出
   */
  @Auth()
  @Post('/logout', {
    description: '用户登出',
  })
  async logout(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

      if (token) {
        await authService.logout(token);
        logger.info('User logged out successfully', { userId: req.user?.sub });
      }

      res.json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error) {
      logger.error('Logout failed', error as Error, { userId: req.user?.sub });

      res.status(500).json({
        success: false,
        message: 'Logout failed',
      });
    }
  }

  /**
   * 获取当前用户信息
   */
  @Auth()
  @Get('/me', {
    description: '获取当前用户信息',
  })
  async me(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      res.json({
        success: true,
        data: {
          id: req.user.sub,
          email: req.user.email,
          username: req.user.username,
          roles: req.user.roles,
          permissions: req.user.permissions,
        },
      });
    } catch (error) {
      logger.error('Failed to get user info', error as Error, { userId: req.user?.sub });

      res.status(500).json({
        success: false,
        message: 'Failed to get user information',
      });
    }
  }
}
