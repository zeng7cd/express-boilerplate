/**
 * JWT认证中间件
 */
import type { Request, Response, NextFunction } from 'express';
import { jwtService } from '@/modules/auth/services/jwt.service';
import type { JWTPayload } from '@/shared/types/auth';

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
        message: 'Access token required',
      });
      return;
    }

    const decoded = jwtService.verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (_error) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};

/**
 * 权限验证中间件
 */
export const requirePermissions = (permissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const hasPermission = permissions.every((permission) => req.user!.permissions.includes(permission));

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
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const hasRole = roles.some((role) => req.user!.roles.includes(role));

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
