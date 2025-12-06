/**
 * 认证相关异常
 */
import { AppException } from './base.exception';

export class UnauthorizedException extends AppException {
  constructor(message = 'Unauthorized', details?: any) {
    super('UNAUTHORIZED', message, 401, details);
  }
}

export class ForbiddenException extends AppException {
  constructor(message = 'Forbidden', details?: any) {
    super('FORBIDDEN', message, 403, details);
  }
}

export class InvalidCredentialsException extends AppException {
  constructor(message = 'Invalid credentials', details?: any) {
    super('INVALID_CREDENTIALS', message, 401, details);
  }
}

export class TokenExpiredException extends AppException {
  constructor(message = 'Token has expired', details?: any) {
    super('TOKEN_EXPIRED', message, 401, details);
  }
}

export class TokenRevokedException extends AppException {
  constructor(message = 'Token has been revoked', details?: any) {
    super('TOKEN_REVOKED', message, 401, details);
  }
}
