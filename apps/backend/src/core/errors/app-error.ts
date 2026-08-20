import {
  ERROR_HTTP_STATUS,
  type ErrorCode,
  type ErrorHttpStatus,
} from './error-codes';

export class AppError extends Error {
  readonly code: ErrorCode;

  readonly details?: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
  }

  get status(): ErrorHttpStatus {
    return ERROR_HTTP_STATUS[this.code];
  }
}
