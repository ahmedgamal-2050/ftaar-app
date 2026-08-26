import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { TerminusModule } from '@nestjs/terminus';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { BillingModule } from '../billing/billing.module';
import { DatabaseModule } from '../database/database.module';
import { AppConfigModule } from '../core/config/app-config.module';
import { AllExceptionsFilter } from '../core/http/all-exceptions.filter';
import { AppLoggerModule } from '../core/http/logger.module';
import { ResponseWrapInterceptor } from '../core/http/response-wrap.interceptor';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthController } from './auth.controller';
import { HealthController } from './health.controller';
import { PrismaHealthIndicator } from './health.indicator';
import { TodosController } from './todos.controller';
import { TodosService } from './todos.service';

@Module({
  imports: [
    AppConfigModule,
    AppLoggerModule,
    DatabaseModule.forRoot(),
    BillingModule,
    TerminusModule,
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60_000, limit: 100 }],
      skipIf: (context) => {
        const req = context.switchToHttp().getRequest<{ url?: string }>();
        return req.url?.includes('/health') === true;
      },
    }),
  ],
  controllers: [
    AppController,
    HealthController,
    TodosController,
    AuthController,
  ],
  providers: [
    AppService,
    TodosService,
    PrismaHealthIndicator,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseWrapInterceptor },
  ],
})
export class AppModule {}
