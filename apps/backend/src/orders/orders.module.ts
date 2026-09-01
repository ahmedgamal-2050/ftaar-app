import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersAdminController } from './orders-admin.controller';
import { OrdersService } from './orders.service';
import { LobbyMemberGuard } from './guards/lobby-member.guard';
import { LobbyAdminGuard } from './guards/lobby-admin.guard';

@Module({
  controllers: [OrdersController, OrdersAdminController],
  providers: [OrdersService, LobbyMemberGuard, LobbyAdminGuard],
  exports: [OrdersService],
})
export class OrdersModule {}
