/**
 * JWT 服务单元测试
 */
import { describe, it, expect } from 'vitest';

import { jwtService } from '@/modules/auth/services';
import type { AuthenticatedUser } from '@/shared/types/auth';

describe('JWTService', () => {
  const mockUser: AuthenticatedUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    username: 'testuser',
    roles: ['user'],
    permissions: ['read'],
  };

  describe('generateAccessToken', () => {
    it('should generate a valid access token', () => {
      const token = jwtService.generateAccessToken(mockUser);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT 格式: header.payload.signature
    });

    it('should include user information in token', () => {
      const token = jwtService.generateAccessToken(mockUser);
      const decoded = jwtService.verifyAccessToken(token);

      expect(decoded.sub).toBe(mockUser.id);
      expect(decoded.email).toBe(mockUser.email);
      expect(decoded.username).toBe(mockUser.username);
      expect(decoded.roles).toEqual(mockUser.roles);
      expect(decoded.permissions).toEqual(mockUser.permissions);
    });

    it('should include jti claim', () => {
      const token = jwtService.generateAccessToken(mockUser);
      const decoded = jwtService.verifyAccessToken(token);

      expect(decoded.jti).toBeDefined();
      expect(typeof decoded.jti).toBe('string');
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const token = jwtService.generateRefreshToken(mockUser.id);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should verify refresh token correctly', () => {
      const token = jwtService.generateRefreshToken(mockUser.id);
      const decoded = jwtService.verifyRefreshToken(token);

      expect(decoded.sub).toBe(mockUser.id);
      expect(decoded.jti).toBeDefined();
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid token', () => {
      const token = jwtService.generateAccessToken(mockUser);
      const decoded = jwtService.verifyAccessToken(token);

      expect(decoded).toBeDefined();
      expect(decoded.sub).toBe(mockUser.id);
    });

    it('should throw error for invalid token', () => {
      expect(() => {
        jwtService.verifyAccessToken('invalid-token');
      }).toThrow();
    });

    it('should throw error for malformed token', () => {
      expect(() => {
        jwtService.verifyAccessToken('not.a.valid.jwt.token');
      }).toThrow();
    });
  });

  describe('decodeToken', () => {
    it('should decode token without verification', () => {
      const token = jwtService.generateAccessToken(mockUser);
      const decoded = jwtService.decodeToken(token);

      expect(decoded).toBeDefined();
      expect(decoded?.sub).toBe(mockUser.id);
    });

    it('should return null for invalid token', () => {
      const decoded = jwtService.decodeToken('invalid-token');
      expect(decoded).toBeNull();
    });
  });

  describe('getExpiresInSeconds', () => {
    it('should return expiration time in seconds', () => {
      const expiresIn = jwtService.getExpiresInSeconds();

      expect(expiresIn).toBeGreaterThan(0);
      expect(typeof expiresIn).toBe('number');
    });
  });
});
