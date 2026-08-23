import { DynamicModule, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { shouldSkipDatabase } from './skip-db';

@Module({})
export class DatabaseModule {
  static forRoot(): DynamicModule {
    if (shouldSkipDatabase()) {
      // Provide a stub so DI resolves PrismaService even without a real DB.
      // Any actual DB operation will throw at runtime (expected in unit tests).
      return {
        module: DatabaseModule,
        providers: [{ provide: PrismaService, useValue: {} }],
        exports: [PrismaService],
        global: true,
      };
    }

    return {
      module: DatabaseModule,
      providers: [PrismaService],
      exports: [PrismaService],
      global: true,
    };
  }
}
