import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { RegisteredUserGuard } from '../auth/guards/registered-user.guard';
import { ParseUuidPipe } from '../shared/parse-uuid.pipe';
import { BulkMenuDto } from './dto/bulk-menu.dto';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { MenuService } from './menu.service';

@ApiTags('menu')
@ApiBearerAuth()
@Controller('restaurants')
export class RestaurantMenuController {
  constructor(private readonly menu: MenuService) {}

  @Post(':id/menu')
  @UseGuards(RegisteredUserGuard)
  @ApiOperation({ summary: 'Add a menu item (registered users only)' })
  async create(
    @Param('id', ParseUuidPipe) restaurantId: string,
    @Body() dto: CreateMenuItemDto,
  ) {
    const item = await this.menu.create(restaurantId, dto);
    return item.toResponse();
  }

  @Get(':id/menu')
  @ApiOperation({
    summary: 'List menu items sorted by category then name',
  })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
  })
  async list(
    @Param('id', ParseUuidPipe) restaurantId: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    const items = await this.menu.list(
      restaurantId,
      includeInactive === 'true' || includeInactive === '1',
    );
    return items.map((item) => item.toResponse());
  }

  @Post(':id/menu/bulk')
  @UseGuards(RegisteredUserGuard)
  @ApiOperation({
    summary: 'Create up to 200 menu items in one transaction (all-or-nothing)',
  })
  async bulk(
    @Param('id', ParseUuidPipe) restaurantId: string,
    @Body() dto: BulkMenuDto,
  ) {
    const items = await this.menu.bulkCreate(restaurantId, dto.items);
    return items.map((item) => item.toResponse());
  }
}
