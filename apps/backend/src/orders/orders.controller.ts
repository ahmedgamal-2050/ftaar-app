import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ParseUuidPipe } from '../shared/parse-uuid.pipe';
import { AddOrderItemDto } from './dto/add-order-item.dto';
import { UpdateOrderItemDto } from './dto/update-order-item.dto';
import { LobbyMemberGuard } from './guards/lobby-member.guard';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Authentication required' })
@UseGuards(LobbyMemberGuard)
@Controller('lobbies/:lobbyId/orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('items')
  @ApiOperation({ summary: 'Add an item to current user order' })
  addItem(
    @CurrentUser('id') userId: string,
    @Param('lobbyId', ParseUuidPipe) lobbyId: string,
    @Body() dto: AddOrderItemDto,
  ) {
    return this.ordersService.addItem(userId, lobbyId, dto);
  }

  @Patch('items/:itemId')
  @ApiOperation({ summary: 'Update quantity of an order item' })
  updateItem(
    @CurrentUser('id') userId: string,
    @Param('lobbyId', ParseUuidPipe) lobbyId: string,
    @Param('itemId', ParseUuidPipe) itemId: string,
    @Body() dto: UpdateOrderItemDto,
  ) {
    return this.ordersService.updateItem(userId, lobbyId, itemId, dto);
  }

  @Delete('items/:itemId')
  @ApiOperation({ summary: 'Remove an item from current user order' })
  removeItem(
    @CurrentUser('id') userId: string,
    @Param('lobbyId', ParseUuidPipe) lobbyId: string,
    @Param('itemId', ParseUuidPipe) itemId: string,
  ) {
    return this.ordersService.removeItem(userId, lobbyId, itemId);
  }

  @Get('items')
  @ApiOperation({ summary: 'Get current member order items and subtotal' })
  findMine(
    @CurrentUser('id') userId: string,
    @Param('lobbyId', ParseUuidPipe) lobbyId: string,
  ) {
    return this.ordersService.findMine(userId, lobbyId);
  }
}
