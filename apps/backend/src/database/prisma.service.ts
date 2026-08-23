import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AppConfigService } from '../core/config/app-config.service';
import { Money } from '../money/money';
import { moneyTransformer } from '../money/money.transformer';
import {
  runInTransaction as runInPrismaTransaction,
  type EntityManager,
} from '../shared/run-in-transaction';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(config: AppConfigService) {
    super({
      datasourceUrl: config.databaseUrl,
    });
  }

  moneyToDb(value: Money | null | undefined): bigint | null {
    return moneyTransformer.to(value);
  }

  moneyFromDb(value: bigint | string | null | undefined): Money | null {
    return moneyTransformer.from(value);
  }

  runInTransaction<T>(work: (em: EntityManager) => Promise<T>): Promise<T> {
    return runInPrismaTransaction(this, work);
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
