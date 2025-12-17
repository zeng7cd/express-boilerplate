/**
 * 验证相关异常
 */
import { AppException } from './base.exception';

export class ValidationException extends AppException {
  constructor(message = 'Validation failed', details?: any) {
    super('VALIDATION_ERROR', message, 400, details);
  }
}

export class DuplicateException extends AppException {
  constructor(message = 'Resource already exists', details?: any) {
    super('DUPLICATE_ERROR', message, 409, details);
  }
}

export class NotFoundException extends AppException {
  constructor(message = 'Resource not found', details?: any) {
    super('NOT_FOUND', message, 404, details);
  }
}
