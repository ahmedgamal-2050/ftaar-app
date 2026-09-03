import { Injectable } from '@nestjs/common';
import type { LobbyStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { AppError } from '../core/errors/app-error';
import { PrismaService } from '../database/prisma.service';
import { MenuItem } from '../menu/menu-item.entity';
import { throwValidationError } from '../core/validation';
import type { CreateRestaurantDto } from './dto/create-restaurant.dto';
import type { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import {
  ACTIVE_LOBBY_STATUSES,
  IMAGE_MIN_LENGTH,
  LIST_DEFAULT_LIMIT,
  LIST_MAX_LIMIT,
  NAME_MIN_LENGTH,
  PHONE_MIN_LENGTH,
  Restaurant,
} from './restaurant.entity';

export type RestaurantListQuery = {
  search?: string;
  page?: number;
  limit?: number;
  includeInactive?: boolean;
};

export type RestaurantListResult = {
  items: Restaurant[];
  page: number;
  limit: number;
  total: number;
};

export type RestaurantWithMenu = {
  restaurant: Restaurant;
  menu: MenuItem[];
};

type RestaurantField = 'name' | 'phone' | 'image' | 'note';

export type RestaurantValidationError = {
  field: RestaurantField;
  code: string;
  message: string;
  meta?: Record<string, unknown>;
};

@Injectable()
export class RestaurantsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: RestaurantListQuery): Promise<RestaurantListResult> {
    const page = query.page !== undefined && query.page > 0 ? query.page : 1;
    const requested = query.limit ?? LIST_DEFAULT_LIMIT;
    const limit = Math.min(Math.max(1, requested), LIST_MAX_LIMIT);
    const includeInactive = query.includeInactive === true;
    const search = query.search?.trim() ?? '';

    const where: Prisma.RestaurantWhereInput = {
      ...(includeInactive ? {} : { isActive: true }),
      ...(search.length > 0
        ? { name: { contains: search, mode: 'insensitive' } }
        : {}),
    };

    const [total, rows] = await Promise.all([
      this.prisma.restaurant.count({ where }),
      this.prisma.restaurant.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items: rows.map((row) => Restaurant.fromPersistence(row)),
      page,
      limit,
      total,
    };
  }

  async create(dto: CreateRestaurantDto): Promise<Restaurant> {
    const name = dto.name.trim();
    const phone = dto.phone.trim();
    const image = dto.image.trim();
    const note = normalizeNote(dto.note);
    assertRestaurantBodyValidation([
      ...validateName(name),
      ...validatePhone(phone),
      ...validateImage(image),
      ...validateNote(note),
    ]);
    try {
      const row = await this.prisma.restaurant.create({
        data: { name, phone, image, note, isActive: true },
      });
      return Restaurant.fromPersistence(row);
    } catch (error) {
      rethrowUniqueName(error);
      throw error;
    }
  }

  async findById(
    id: string,
    includeInactiveRestaurant: boolean,
    includeInactiveMenu: boolean,
  ): Promise<RestaurantWithMenu> {
    const row = await this.prisma.restaurant.findFirst({
      where: {
        id,
        ...(includeInactiveRestaurant ? {} : { isActive: true }),
      },
      include: {
        menuItems: {
          where: includeInactiveMenu ? {} : { isActive: true },
          orderBy: [{ category: 'asc' }, { name: 'asc' }],
        },
      },
    });
    if (!row) {
      throw new AppError('NOT_FOUND', `Restaurant ${id} not found`);
    }
    const { menuItems, ...restaurant } = row;
    return {
      restaurant: Restaurant.fromPersistence(restaurant),
      menu: menuItems.map((item) => MenuItem.fromPersistence(item)),
    };
  }

  async update(id: string, dto: UpdateRestaurantDto): Promise<Restaurant> {
    await this.requireRestaurant(id, true);
    const data: Prisma.RestaurantUpdateInput = {};
    const validationErrors: RestaurantValidationError[] = [];
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      validationErrors.push(...validateName(name));
      data.name = name;
    }
    if (dto.phone !== undefined) {
      const phone = dto.phone.trim();
      validationErrors.push(...validatePhone(phone));
      data.phone = phone;
    }
    if (dto.image !== undefined) {
      const image = dto.image.trim();
      validationErrors.push(...validateImage(image));
      data.image = image;
    }
    if (dto.note !== undefined) {
      const note = normalizeNote(dto.note);
      validationErrors.push(...validateNote(note));
      data.note = note;
    }
    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }
    assertRestaurantBodyValidation(validationErrors);
    try {
      const row = await this.prisma.restaurant.update({ where: { id }, data });
      return Restaurant.fromPersistence(row);
    } catch (error) {
      rethrowUniqueName(error);
      throw error;
    }
  }

  async remove(id: string): Promise<Restaurant> {
    await this.requireRestaurant(id, true);
    const referenced = await this.prisma.lobby.count({
      where: {
        restaurantId: id,
        status: { in: [...ACTIVE_LOBBY_STATUSES] as LobbyStatus[] },
      },
    });
    if (referenced > 0) {
      throw new AppError(
        'CONFLICT',
        'Restaurant is referenced by an active lobby',
        { referenced },
      );
    }
    const row = await this.prisma.restaurant.update({
      where: { id },
      data: { isActive: false },
    });
    return Restaurant.fromPersistence(row);
  }

  private async requireRestaurant(
    id: string,
    includeInactive: boolean,
  ): Promise<void> {
    const row = await this.prisma.restaurant.findFirst({
      where: { id, ...(includeInactive ? {} : { isActive: true }) },
      select: { id: true },
    });
    if (!row) {
      throw new AppError('NOT_FOUND', `Restaurant ${id} not found`);
    }
  }
}

function normalizeNote(note: string | null | undefined): string | null {
  if (note === undefined || note === null) {
    return null;
  }
  const trimmed = note.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function validateName(name: string): RestaurantValidationError[] {
  if (name.length < NAME_MIN_LENGTH) {
    return [
      {
        field: 'name',
        code: 'MIN_LENGTH',
        message: `name must be at least ${NAME_MIN_LENGTH} characters`,
        meta: { min: NAME_MIN_LENGTH },
      },
    ];
  }
  return [];
}

function validatePhone(phone: string): RestaurantValidationError[] {
  if (phone.length < PHONE_MIN_LENGTH) {
    return [
      {
        field: 'phone',
        code: 'MIN_LENGTH',
        message: `phone must be at least ${PHONE_MIN_LENGTH} characters`,
        meta: { min: PHONE_MIN_LENGTH },
      },
    ];
  }
  return [];
}

function validateImage(image: string): RestaurantValidationError[] {
  if (image.length < IMAGE_MIN_LENGTH) {
    return [
      {
        field: 'image',
        code: 'REQUIRED',
        message: 'image is required',
      },
    ];
  }
  return [];
}

function validateNote(note: string | null): RestaurantValidationError[] {
  if (note !== null && note.length > 2000) {
    return [
      {
        field: 'note',
        code: 'MAX_LENGTH',
        message: 'note must be shorter than or equal to 2000 characters',
        meta: { max: 2000 },
      },
    ];
  }
  return [];
}

function assertRestaurantBodyValidation(
  errors: RestaurantValidationError[],
): void {
  if (errors.length > 0) {
    throwValidationError(
      errors.map((error) => ({
        path: error.field,
        code: error.code,
        message: error.message,
        ...(error.meta ? { meta: error.meta } : {}),
      })),
    );
  }
}

function rethrowUniqueName(error: unknown): void {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    throw new AppError(
      'ALREADY_EXISTS',
      'A restaurant with this name already exists',
    );
  }
}
