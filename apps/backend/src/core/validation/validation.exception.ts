import { AppError } from '../errors/app-error';
import type { ValidationErrorItem } from './validation-error.types';

export class ValidationException extends AppError {
  constructor(errors: ValidationErrorItem[], message = 'Validation failed') {
    super('VALIDATION_ERROR', message, { errors });
  }
}

export function throwValidationError(
  errors: ValidationErrorItem[],
  message = 'Validation failed',
): never {
  throw new ValidationException(errors, message);
}
