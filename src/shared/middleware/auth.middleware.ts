/**
 * JWT认证中间件
 */
import { tokenBlacklistService } from '@/core/services/token-blacklist.service';
import { jwtService } from '@/modules/auth/services/jwt.service';
import type { JWTPayload } from '@/shared/types/auth';

import type { Request, Response, NextFunction } from 'express';

// 扩展Request接口
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * JWT认证中间件
 */
export const authenticateJWT = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (!token) {
      res.status(401).json({
        success: false,
        code: 'TOKEN_REQUIRED',
        message: 'Access token required',
      });
      return;
    }

    // 验证 token
    const decoded = jwtService.verifyAccessToken(token);

    // 检查 token 是否在黑名单中
    const isBlacklisted = await tokenBlacklistService.isBlacklisted(token);
    if (isBlacklisted) {
      res.status(401).json({
        success: false,
        code: 'TOKEN_REVOKED',
        message: 'Token has been revoked',
      });
      return;
    }

    // 检查用户的所有 token 是否被撤销
    const isUserBlacklisted = await tokenBlacklistService.isUserBlacklisted(decoded.sub);
    if (isUserBlacklisted) {
      res.status(401).json({
        success: false,
        code: 'USER_TOKENS_REVOKED',
        message: 'All user tokens have been revoked',
      });
      return;
    }

    req.user = decoded;
    next();
  } catch (_error) {
    res.status(401).json({
      success: false,
      code: 'INVALID_TOKEN',
      message: 'Invalid or expired token',
    });
  }
};

/**
 * 权限验证中间件
 */
export const requirePermissions = (permissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const hasPermission = permissions.every((permission) => user.permissions.includes(permission));

    if (!hasPermission) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
      return;
    }

    next();
  };
};

/**
 * 角色验证中间件
 */
export const requireRoles = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const hasRole = roles.some((role) => user.roles.includes(role));

    if (!hasRole) {
      res.status(403).json({
        success: false,
        message: 'Insufficient role privileges',
      });
      return;
    }

    next();
  };
};
