/**
 * Token 黑名单服务单元测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { cacheService } from '@/core/cache';
import { tokenBlacklistService } from '@/core/services';
import { jwtService } from '@/modules/auth/services';

// Mock cache service
vi.mock('@/core/cache', () => ({
  cacheService: {
    set: vi.fn(),
    get: vi.fn(),
  },
}));

describe('TokenBlacklistService', () => {
  const mockUserId = 'test-user-id';
  const mockUser = {
    id: mockUserId,
    email: 'test@example.com',
    username: 'testuser',
    roles: ['user'],
    permissions: ['read'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addToBlacklist', () => {
    it('should add token to blacklist', async () => {
      const token = jwtService.generateAccessToken(mockUser);

      vi.mocked(cacheService.set).mockResolvedValue(true);

      await tokenBlacklistService.addToBlacklist(token);

      expect(cacheService.set).toHaveBeenCalledWith(expect.stringContaining('blacklist:'), true, expect.any(Number));
    });

    it('should handle token without jti', async () => {
      const invalidToken = 'invalid-token';

      await expect(tokenBlacklistService.addToBlacklist(invalidToken)).rejects.toThrow();
    });
  });

  describe('isBlacklisted', () => {
    it('should return true for blacklisted token', async () => {
      const token = jwtService.generateAccessToken(mockUser);

      vi.mocked(cacheService.get).mockResolvedValue(true);

      const result = await tokenBlacklistService.isBlacklisted(token);

      expect(result).toBe(true);
    });

    it('should return false for non-blacklisted token', async () => {
      const token = jwtService.generateAccessToken(mockUser);

      vi.mocked(cacheService.get).mockResolvedValue(null);

      const result = await tokenBlacklistService.isBlacklisted(token);

      expect(result).toBe(false);
    });
  });

  describe('blacklistUserTokens', () => {
    it('should blacklist all user tokens', async () => {
      vi.mocked(cacheService.set).mockResolvedValue(true);

      await tokenBlacklistService.blacklistUserTokens(mockUserId, 3600);

      expect(cacheService.set).toHaveBeenCalledWith(`blacklist:user:${mockUserId}`, true, 3600);
    });
  });

  describe('isUserBlacklisted', () => {
    it('should return true if user is blacklisted', async () => {
      vi.mocked(cacheService.get).mockResolvedValue(true);

      const result = await tokenBlacklistService.isUserBlacklisted(mockUserId);

      expect(result).toBe(true);
    });

    it('should return false if user is not blacklisted', async () => {
      vi.mocked(cacheService.get).mockResolvedValue(null);

      const result = await tokenBlacklistService.isUserBlacklisted(mockUserId);

      expect(result).toBe(false);
    });
  });
});
