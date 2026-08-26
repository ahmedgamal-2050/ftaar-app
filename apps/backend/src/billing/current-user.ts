import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { AppError } from '../core/errors/app-error';
import { ParseUuidPipe } from '../shared/parse-uuid.pipe';

export const USER_ID_HEADER = 'x-user-id';

export const CurrentUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const header = request.header(USER_ID_HEADER);
    if (!header) {
      throw new AppError('UNAUTHORIZED', `${USER_ID_HEADER} is required`);
    }
    return new ParseUuidPipe().transform(header);
  },
);
