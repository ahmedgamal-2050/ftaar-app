import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ParseUuidPipe } from '../shared/parse-uuid.pipe';
import { OverrideItemPriceDto } from './dto/override-price.dto';
import { LobbyAdminGuard } from './guards/lobby-admin.guard';
import { OrdersService } from './orders.service';

@ApiTags('orders-admin')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Authentication required' })
@UseGuards(LobbyAdminGuard)
@Controller('lobbies/:lobbyId/admin/orders')
export class OrdersAdminController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all order items in the lobby (Admin only)' })
  listForLobby(
    @CurrentUser('id') userId: string,
    @Param('lobbyId', ParseUuidPipe) lobbyId: string,
  ) {
    return this.ordersService.listForLobby(userId, lobbyId);
  }

  @Get('summary')
  @ApiOperation({
    summary:
      'Get aggregated order quantities per item for restaurant ordering (Admin only)',
  })
  getSummary(
    @CurrentUser('id') userId: string,
    @Param('lobbyId', ParseUuidPipe) lobbyId: string,
  ) {
    return this.ordersService.getAggregatedOrderSummary(userId, lobbyId);
  }

  @Patch('menu-items/:menuItemId/price')
  @ApiOperation({
    summary:
      'Admin price override for a menu item across all lobby member orders',
  })
  overrideMenuItemPrice(
    @CurrentUser('id') userId: string,
    @Param('lobbyId', ParseUuidPipe) lobbyId: string,
    @Param('menuItemId', ParseUuidPipe) menuItemId: string,
    @Body() dto: OverrideItemPriceDto,
  ) {
    return this.ordersService.overridePrice(userId, lobbyId, menuItemId, dto);
  }
}
