import type { ValidationErrorCode } from './validation-error.types';

const CODE_BY_CONSTRAINT: Record<string, ValidationErrorCode> = {
  isNotEmpty: 'REQUIRED',
  isDefined: 'REQUIRED',
  isEmail: 'INVALID_EMAIL',
  isUrl: 'INVALID_URL',
  minLength: 'MIN_LENGTH',
  maxLength: 'MAX_LENGTH',
  isNumber: 'INVALID_NUMBER',
  isInt: 'INVALID_NUMBER',
  isNumberString: 'INVALID_NUMBER',
  matches: 'INVALID_FORMAT',
  isBoolean: 'INVALID_BOOLEAN',
};

export function mapConstraintToValidationCode(
  constraintName: string,
): ValidationErrorCode {
  return CODE_BY_CONSTRAINT[constraintName] ?? 'INVALID_VALUE';
}
