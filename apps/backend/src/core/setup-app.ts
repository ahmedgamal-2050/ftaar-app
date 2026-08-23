import {
  RequestMethod,
  ValidationPipe,
  type INestApplication,
} from '@nestjs/common';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import type { AppConfigService } from './config/app-config.service';
import { AppError } from './errors/app-error';
import { requestIdMiddleware } from './http/request-id.middleware';
import { setupSwagger } from './http/swagger';

export const GLOBAL_PREFIX = 'api';

export function setupApp(
  app: INestApplication,
  config: AppConfigService,
): void {
  app.use(helmet());
  app.enableCors({
    origin: config.corsOrigins,
    credentials: true,
  });
  app.use(json({ limit: config.bodyLimit }));
  app.use(urlencoded({ extended: true, limit: config.bodyLimit }));
  app.use(requestIdMiddleware);
  app.setGlobalPrefix(GLOBAL_PREFIX, {
    exclude: [
      { path: 'health', method: RequestMethod.ALL },
      { path: 'health/(.*)', method: RequestMethod.ALL },
    ],
  });
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
