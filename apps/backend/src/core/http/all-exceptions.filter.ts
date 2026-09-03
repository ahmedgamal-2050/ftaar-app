import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AppConfigService } from '../config/app-config.service';
import { AppError } from '../errors/app-error';
import { errorCodeFromHttpStatus, type ErrorCode } from '../errors/error-codes';
import type { ValidationErrorItem } from '../validation';
import { getRequestId } from './request-context';

export interface ErrorEnvelope {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
  requestId?: string;
}

interface ValidationErrorEnvelope {
  statusCode: 422;
  code: 'VALIDATION_ERROR';
  message: string;
  errors: ValidationErrorItem[];
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly appConfig: AppConfigService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = getRequestId() ?? request.header('x-request-id');

    const { status, code, message, details } = this.normalize(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${message} [${code}] ${request.url} requestId=${requestId ?? 'none'}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    if (code === 'VALIDATION_ERROR') {
      const validationBody: ValidationErrorEnvelope = {
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        code: 'VALIDATION_ERROR',
        message,
        errors: this.extractValidationErrors(details),
      };
      response.status(HttpStatus.UNPROCESSABLE_ENTITY).json(validationBody);
      return;
    }

    const body: ErrorEnvelope = {
      success: false,
      error: {
        code,
        message,
        ...(details !== undefined ? { details } : {}),
      },
      ...(requestId ? { requestId } : {}),
    };

    response.status(status).json(body);
  }

  private normalize(exception: unknown): {
    status: number;
    code: ErrorCode;
    message: string;
    details?: unknown;
  } {
    if (exception instanceof AppError) {
      return {
        status: exception.status,
        code: exception.code,
        message: exception.message,
        details: exception.details,
      };
    }

    if (exception instanceof ThrottlerException) {
      return {
        status: HttpStatus.TOO_MANY_REQUESTS,
        code: 'RATE_LIMITED',
        message: 'Too many requests',
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      const { message, details, isValidation } = this.fromHttpPayload(payload);
      return {
        status,
        code: isValidation
          ? 'VALIDATION_ERROR'
          : errorCodeFromHttpStatus(status),
        message,
        details,
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: this.appConfig.isProduction
        ? 'Internal server error'
        : exception instanceof Error
          ? exception.message
          : 'Internal server error',
    };
  }

  private fromHttpPayload(payload: string | object): {
    message: string;
    details?: unknown;
    isValidation: boolean;
  } {
    if (typeof payload === 'string') {
      return { message: payload, isValidation: false };
    }

    const record = payload as {
      message?: string | string[];
      error?: string;
    };
    const raw = record.message;

    if (Array.isArray(raw)) {
      return {
        message: 'Validation failed',
        details: raw,
        isValidation: true,
      };
    }

    return {
      message: raw ?? record.error ?? 'Request failed',
      isValidation: false,
    };
  }

  private extractValidationErrors(details: unknown): ValidationErrorItem[] {
    if (
      details &&
      typeof details === 'object' &&
      Array.isArray((details as { errors?: unknown }).errors)
    ) {
      return (details as { errors: ValidationErrorItem[] }).errors;
    }
    return [];
  }
}
