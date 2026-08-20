import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { INestApplication } from '@nestjs/common';

export function buildOpenApiDocument(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Ftaar API')
    .setDescription('Foundation REST API')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  return SwaggerModule.createDocument(app, config);
}

export function setupSwagger(app: INestApplication): void {
  const document = buildOpenApiDocument(app);
  SwaggerModule.setup('docs', app, document, {
    jsonDocumentUrl: 'docs/openapi.json',
  });
}

export function writeOpenApiFile(
  app: INestApplication,
  outputPath: string,
): void {
  const document = buildOpenApiDocument(app);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
}
