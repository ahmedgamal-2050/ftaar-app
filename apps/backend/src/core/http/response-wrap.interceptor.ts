import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface SuccessEnvelope<T> {
  success: true;
  data: T;
}

function isEnvelope(body: unknown): body is { success: boolean } {
  return (
    typeof body === 'object' &&
    body !== null &&
    'success' in body &&
    typeof (body as { success: unknown }).success === 'boolean'
  );
}

@Injectable()
export class ResponseWrapInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((body) => {
        const res = context.switchToHttp().getResponse<Response>();
        if (res.statusCode === HttpStatus.NO_CONTENT) {
          return body;
        }
        if (isEnvelope(body)) {
          return body;
        }
        const wrapped: SuccessEnvelope<unknown> = { success: true, data: body };
        return wrapped;
      }),
    );
  }
}
