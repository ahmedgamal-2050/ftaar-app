/**
 * NestJS API bootstrap. reflect-metadata must load before decorated classes.
 */
import 'reflect-metadata';
import { Logger } from 'nestjs-pino';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { AppConfigService } from './core/config/app-config.service';
import { writeOpenApiFile } from './core/http/swagger';
import { GLOBAL_PREFIX, setupApp } from './core/setup-app';

async function bootstrap() {
  const exportOpenApi = process.argv.includes('--export-openapi');

  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  setupApp(app);

  if (exportOpenApi) {
    const outputPath = process.env['OPENAPI_OUT'] ?? 'openapi.json';
    writeOpenApiFile(app, outputPath);
    await app.close();
    return;
  }

  const config = app.get(AppConfigService);
  await app.listen(config.port);
  const logger = app.get(Logger);
  logger.log(
    `Application is running on: http://localhost:${config.port}/${GLOBAL_PREFIX}`,
  );
  logger.log(`Swagger UI: http://localhost:${config.port}/docs`);
}

bootstrap();
