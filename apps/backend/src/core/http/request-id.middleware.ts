import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { requestAls } from './request-context';

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const header = req.header('x-request-id');
  const requestId = header && header.trim().length > 0 ? header : randomUUID();
  req.headers['x-request-id'] = requestId;
  res.setHeader('x-request-id', requestId);
  requestAls.run({ requestId }, () => next());
}
