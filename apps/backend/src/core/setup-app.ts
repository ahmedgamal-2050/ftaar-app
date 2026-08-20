import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { AppError } from './errors/app-error';
import { requestIdMiddleware } from './http/request-id.middleware';
import { setupSwagger } from './http/swagger';

export const GLOBAL_PREFIX = 'api';

export function setupApp(app: INestApplication): void {
  app.use(requestIdMiddleware);
  app.setGlobalPrefix(GLOBAL_PREFIX);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: (errors) =>
        new AppError('VALIDATION_ERROR', 'Validation failed', errors),
    }),
  );
  setupSwagger(app);
}
