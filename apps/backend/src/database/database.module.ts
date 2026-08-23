import { DynamicModule, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { shouldSkipDatabase } from './skip-db';

@Module({})
export class DatabaseModule {
  static forRoot(): DynamicModule {
    if (shouldSkipDatabase()) {
      return { module: DatabaseModule };
    }

    return {
      module: DatabaseModule,
      providers: [PrismaService],
      exports: [PrismaService],
      global: true,
    };
  }
}
