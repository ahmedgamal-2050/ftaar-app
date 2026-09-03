export type ValidationErrorCode =
  | 'REQUIRED'
  | 'INVALID_EMAIL'
  | 'INVALID_URL'
  | 'MIN_LENGTH'
  | 'MAX_LENGTH'
  | 'INVALID_NUMBER'
  | 'INVALID_FORMAT'
  | 'INVALID_BOOLEAN'
  | 'INVALID_VALUE'
  | string;

export interface ValidationErrorItem {
  path: string;
  code: ValidationErrorCode;
  message: string;
  meta?: Record<string, unknown>;
}

export interface ValidationErrorResponse {
  statusCode: 422;
  code: 'VALIDATION_ERROR';
  message: string;
  errors: ValidationErrorItem[];
}
