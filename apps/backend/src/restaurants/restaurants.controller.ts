import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { RegisteredUserGuard } from '../auth/guards/registered-user.guard';
import { ParseUuidPipe } from '../shared/parse-uuid.pipe';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { RestaurantsService } from './restaurants.service';

function parseFlag(value?: string): boolean {
  return value === 'true' || value === '1';
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (value === undefined || value === '') {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

@ApiTags('restaurants')
@ApiBearerAuth()
@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurants: RestaurantsService) {}

  @Get()
  @ApiOperation({
    summary:
      'List restaurants (active by default). Search is case-insensitive, including Arabic.',
  })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Max 100',
  })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  async list(
    @CurrentUser() user: AuthUser,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    const isManager = user.kind === 'registered';
    const result = await this.restaurants.list({
      search,
      page: parsePositiveInt(page, 1),
      limit: parsePositiveInt(limit, 20),
      includeInactive: isManager && parseFlag(includeInactive),
    });
    return {
      items: result.items.map((item) => item.toResponse()),
      page: result.page,
      limit: result.limit,
      total: result.total,
    };
  }

  @Post()
  @UseGuards(RegisteredUserGuard)
  @ApiOperation({ summary: 'Create a restaurant (registered users only)' })
  async create(@Body() dto: CreateRestaurantDto) {
    const restaurant = await this.restaurants.create(dto);
    return restaurant.toResponse();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a restaurant with its menu, sorted by category then name',
  })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  async findOne(
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Query('includeInactive') includeInactive?: string,
  ) {
    const allowInactive =
      user.kind === 'registered' && parseFlag(includeInactive);
    const { restaurant, menu } = await this.restaurants.findById(
      id,
      allowInactive,
      allowInactive,
    );
    return restaurant.toResponse(menu.map((item) => item.toResponse()));
  }

  @Patch(':id')
  @UseGuards(RegisteredUserGuard)
  @ApiOperation({ summary: 'Partially update a restaurant' })
  async update(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: UpdateRestaurantDto,
  ) {
    const restaurant = await this.restaurants.update(id, dto);
    return restaurant.toResponse();
  }

  @Delete(':id')
  @UseGuards(RegisteredUserGuard)
  @ApiOperation({
    summary:
      'Soft-delete a restaurant. 409 if an open, locked, or billed lobby still references it.',
  })
  async remove(@Param('id', ParseUuidPipe) id: string) {
    const restaurant = await this.restaurants.remove(id);
    return restaurant.toResponse();
  }
}
