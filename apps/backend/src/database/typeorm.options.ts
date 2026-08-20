import type { DataSourceOptions } from 'typeorm';
import type { AppConfigService } from '../core/config/app-config.service';
import { LobbyBillEntity } from './entities/lobby-bill.entity';
import { LobbyMemberEntity } from './entities/lobby-member.entity';
import { LobbyEntity } from './entities/lobby.entity';
import { MenuItemEntity } from './entities/menu-item.entity';
import { OrderItemEntity } from './entities/order-item.entity';
import { RestaurantEntity } from './entities/restaurant.entity';
import { UserEntity } from './entities/user.entity';
import { CheckConstraints1700000000008 } from './migrations/1700000000008-CheckConstraints';
import { CompositeForeignKeys1700000000009 } from './migrations/1700000000009-CompositeForeignKeys';
import { CreateEnums1700000000002 } from './migrations/1700000000002-CreateEnums';
import { CreateLobbiesAndMembers1700000000005 } from './migrations/1700000000005-CreateLobbiesAndMembers';
import { CreateOrderItemsAndLobbyBill1700000000006 } from './migrations/1700000000006-CreateOrderItemsAndLobbyBill';
import { CreateRestaurantsAndMenuItems1700000000004 } from './migrations/1700000000004-CreateRestaurantsAndMenuItems';
import { CreateUsers1700000000003 } from './migrations/1700000000003-CreateUsers';
import { PerformanceIndexes1700000000010 } from './migrations/1700000000010-PerformanceIndexes';
import { UniqueIndexes1700000000007 } from './migrations/1700000000007-UniqueIndexes';

export const TYPEORM_ENTITIES = [
  UserEntity,
  RestaurantEntity,
  MenuItemEntity,
  LobbyEntity,
  LobbyMemberEntity,
  OrderItemEntity,
  LobbyBillEntity,
];

export const TYPEORM_MIGRATIONS = [
  CreateEnums1700000000002,
  CreateUsers1700000000003,
  CreateRestaurantsAndMenuItems1700000000004,
  CreateLobbiesAndMembers1700000000005,
  CreateOrderItemsAndLobbyBill1700000000006,
  UniqueIndexes1700000000007,
  CheckConstraints1700000000008,
  CompositeForeignKeys1700000000009,
  PerformanceIndexes1700000000010,
];

export function shouldSkipDatabase(): boolean {
  return (
    process.argv.includes('--export-openapi') ||
    process.env['SKIP_DB'] === 'true'
  );
}

/** Nest and CLI share this. `synchronize` is always false. */
export function buildTypeOrmOptions(databaseUrl: string): DataSourceOptions {
  return {
    type: 'postgres',
    url: databaseUrl,
    entities: TYPEORM_ENTITIES,
    migrations: TYPEORM_MIGRATIONS,
    migrationsTableName: 'typeorm_migrations',
    synchronize: false,
    migrationsRun: false,
    logging: false,
  };
}

export function buildTypeOrmOptionsFromConfig(
  config: AppConfigService,
): DataSourceOptions {
  return buildTypeOrmOptions(config.databaseUrl);
}
