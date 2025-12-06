/**
 * 认证相关 DTO
 */

export interface AuthResponseDto {
  user: {
    id: string;
    email: string;
    username: string;
    roles: string[];
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

export function createAuthResponse(data: {
  user: { id: string; email: string; username: string; roles: string[] };
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}): AuthResponseDto {
  return {
    user: data.user,
    tokens: {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresIn: data.expiresIn,
    },
  };
}

export interface TokenResponseDto {
  accessToken: string;
  expiresIn: number;
}

export function createTokenResponse(accessToken: string, expiresIn: number): TokenResponseDto {
  return {
    accessToken,
    expiresIn,
  };
}
