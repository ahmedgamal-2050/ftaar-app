import { DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigService } from '../core/config/app-config.service';
import {
  buildTypeOrmOptionsFromConfig,
  shouldSkipDatabase,
  TYPEORM_ENTITIES,
} from './typeorm.options';

@Module({})
export class DatabaseModule {
  static forRoot(): DynamicModule {
    if (shouldSkipDatabase()) {
      return { module: DatabaseModule };
    }

    return {
      module: DatabaseModule,
      imports: [
        TypeOrmModule.forRootAsync({
          inject: [AppConfigService],
          useFactory: (config: AppConfigService) =>
            buildTypeOrmOptionsFromConfig(config),
        }),
        TypeOrmModule.forFeature(TYPEORM_ENTITIES),
      ],
      exports: [TypeOrmModule],
    };
  }
}
