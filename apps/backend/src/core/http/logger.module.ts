import { randomUUID } from 'node:crypto';
import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { AppConfigModule } from '../config/app-config.module';
import { AppConfigService } from '../config/app-config.service';
import { requestAls } from './request-context';

const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.body.password',
  'req.body.token',
  'req.body.accessToken',
  'req.body.refreshToken',
  'req.body.secret',
  '*.password',
  '*.token',
  '*.accessToken',
  '*.refreshToken',
  '*.secret',
];

@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (appConfig: AppConfigService) => ({
        pinoHttp: {
          level: appConfig.logLevel,
          genReqId: () => requestAls.getStore()?.requestId ?? randomUUID(),
          mixin: () => {
            const requestId = requestAls.getStore()?.requestId;
            return requestId ? { requestId } : {};
          },
          redact: {
            paths: REDACT_PATHS,
            censor: '[Redacted]',
          },
          transport:
            appConfig.nodeEnv === 'development'
              ? {
                  target: 'pino-pretty',
                  options: { colorize: true, singleLine: true },
                }
              : undefined,
        },
      }),
    }),
  ],
})
export class AppLoggerModule {}
