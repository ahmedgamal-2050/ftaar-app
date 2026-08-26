import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { FinaliseFault } from './finalise-fault';
import { LobbyAccessService } from './lobby-access.service';

@Module({
  controllers: [BillingController],
  providers: [BillingService, LobbyAccessService, FinaliseFault],
  exports: [BillingService, FinaliseFault],
})
export class BillingModule {}
