import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
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
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { MenuService } from './menu.service';

@ApiTags('menu')
@ApiBearerAuth()
@UseGuards(RegisteredUserGuard)
@Controller('menu-items')
export class MenuItemsController {
  constructor(private readonly menu: MenuService) {}

  @Patch(':id')
  @ApiOperation({ summary: 'Partially update a menu item' })
  async update(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: UpdateMenuItemDto,
  ) {
    const item = await this.menu.update(id, dto);
    return item.toResponse();
  }

  @Delete(':id')
  @ApiOperation({
    summary:
      'Soft-delete a menu item. Referenced items require force=true (never hard-deleted).',
  })
  @ApiQuery({ name: 'force', required: false, type: Boolean })
  async remove(
    @Param('id', ParseUuidPipe) id: string,
    @Query('force') force?: string,
  ) {
    const item = await this.menu.remove(id, force === 'true' || force === '1');
    return item.toResponse();
  }
}
