import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AppError } from '../core/errors/app-error';
import { PrismaService } from '../database/prisma.service';
import { moneyTransformer } from '../money/money.transformer';
import type { EntityManager } from '../shared/run-in-transaction';
import type { CreateMenuItemDto } from './dto/create-menu-item.dto';
import type { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { MenuItem, parseReferencePrice } from './menu-item.entity';

export type BulkRowError = { index: number; message: string };

const BULK_MAX_ITEMS = 200;

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    restaurantId: string,
    dto: CreateMenuItemDto,
  ): Promise<MenuItem> {
    await this.requireRestaurant(restaurantId);
    const data = this.toCreateData(restaurantId, dto);
    try {
      const row = await this.prisma.menuItem.create({ data });
      return MenuItem.fromPersistence(row);
    } catch (error) {
      this.rethrowUniqueName(error);
      throw error;
    }
  }

  async list(
    restaurantId: string,
    includeInactive: boolean,
  ): Promise<MenuItem[]> {
    await this.requireRestaurant(restaurantId);
    const rows = await this.prisma.menuItem.findMany({
      where: {
        restaurantId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    return rows.map((row) => MenuItem.fromPersistence(row));
  }

  async update(id: string, dto: UpdateMenuItemDto): Promise<MenuItem> {
    await this.requireItem(id);
    const data: Prisma.MenuItemUpdateInput = {};
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (name === '') {
        throw new AppError('VALIDATION_ERROR', 'name is required');
      }
      data.name = name;
    }
    if (dto.category !== undefined) {
      data.category = dto.category.trim();
    }
    if (dto.referencePrice !== undefined) {
      data.referencePrice = priceToDb(parseReferencePrice(dto.referencePrice));
    }
    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }
    try {
      const row = await this.prisma.menuItem.update({ where: { id }, data });
      return MenuItem.fromPersistence(row);
    } catch (error) {
      this.rethrowUniqueName(error);
      throw error;
    }
  }

  async remove(id: string, force: boolean): Promise<MenuItem> {
    await this.requireItem(id);
    const referenced = await this.prisma.orderItem.count({
      where: { menuItemId: id },
    });
    if (referenced > 0 && !force) {
      throw new AppError(
        'CONFLICT',
        'Menu item is referenced by orders. Pass force=true to deactivate it without deleting.',
        { referenced },
      );
    }
    const row = await this.prisma.menuItem.update({
      where: { id },
      data: { isActive: false },
    });
    return MenuItem.fromPersistence(row);
  }

  async bulkCreate(
    restaurantId: string,
    items: CreateMenuItemDto[],
  ): Promise<MenuItem[]> {
    if (items.length > BULK_MAX_ITEMS) {
      throw new AppError(
        'PAYLOAD_TOO_LARGE',
        `Bulk menu accepts at most ${BULK_MAX_ITEMS} items`,
        { max: BULK_MAX_ITEMS, received: items.length },
      );
    }

    const rowErrors: BulkRowError[] = [];
    const prepared: Array<{
      name: string;
      category: string;
      referencePrice: bigint;
      isActive: boolean;
    }> = [];

    const seenNames = new Map<string, number[]>();

    for (let index = 0; index < items.length; index += 1) {
      const dto = items[index];
      if (!dto) {
        rowErrors.push({ index, message: 'Item is required' });
        continue;
      }
      const name = dto.name.trim();
      if (name === '') {
        rowErrors.push({ index, message: 'name is required' });
        continue;
      }
      const indexes = seenNames.get(name.toLowerCase()) ?? [];
      indexes.push(index);
      seenNames.set(name.toLowerCase(), indexes);

      try {
        const price = parseReferencePrice(dto.referencePrice);
        prepared[index] = {
          name,
          category: dto.category?.trim() ?? '',
          referencePrice: priceToDb(price),
          isActive: dto.isActive ?? true,
        };
      } catch (error) {
        rowErrors.push({
          index,
          message: error instanceof Error ? error.message : 'Invalid row',
        });
      }
    }

    for (const indexes of seenNames.values()) {
      if (indexes.length > 1) {
        for (const index of indexes) {
          rowErrors.push({
            index,
            message: 'Duplicate name in payload',
          });
        }
      }
    }

    if (rowErrors.length > 0) {
      throw this.bulkError(rowErrors);
    }

    return this.prisma.runInTransaction(async (em) => {
      await this.requireRestaurant(restaurantId, em);
      const existing = await em.menuItem.findMany({
        where: { restaurantId },
        select: { name: true },
      });
      const existingLower = new Set(
        existing.map((row) => row.name.toLowerCase()),
      );
      const existingErrors: BulkRowError[] = [];
      for (let index = 0; index < prepared.length; index += 1) {
        const row = prepared[index];
        if (!row) {
          continue;
        }
        if (existingLower.has(row.name.toLowerCase())) {
          existingErrors.push({
            index,
            message: `Name already exists: ${row.name}`,
          });
        }
      }
      if (existingErrors.length > 0) {
        throw this.bulkError(existingErrors);
      }

      const created: MenuItem[] = [];
      for (let index = 0; index < prepared.length; index += 1) {
        const row = prepared[index];
        if (!row) {
          continue;
        }
        try {
          const saved = await em.menuItem.create({
            data: {
              restaurantId,
              name: row.name,
              category: row.category,
              referencePrice: row.referencePrice,
              isActive: row.isActive,
            },
          });
          created.push(MenuItem.fromPersistence(saved));
        } catch (error) {
          if (isUniqueNameViolation(error)) {
            throw this.bulkError([
              { index, message: `Name already exists: ${row.name}` },
            ]);
          }
          throw error;
        }
      }
      return created;
    });
  }

  private toCreateData(
    restaurantId: string,
    dto: CreateMenuItemDto,
  ): Prisma.MenuItemCreateInput {
    const name = dto.name.trim();
    if (name === '') {
      throw new AppError('VALIDATION_ERROR', 'name is required');
    }
    return {
      restaurant: { connect: { id: restaurantId } },
      name,
      category: dto.category?.trim() ?? '',
      referencePrice: priceToDb(parseReferencePrice(dto.referencePrice)),
      isActive: dto.isActive ?? true,
    };
  }

  private async requireRestaurant(
    restaurantId: string,
    em: EntityManager | PrismaService = this.prisma,
  ): Promise<void> {
    const restaurant = await em.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true },
    });
    if (!restaurant) {
      throw new AppError('NOT_FOUND', `Restaurant ${restaurantId} not found`);
    }
  }

  private async requireItem(id: string) {
    const row = await this.prisma.menuItem.findUnique({ where: { id } });
    if (!row) {
      throw new AppError('NOT_FOUND', `Menu item ${id} not found`);
    }
    return row;
  }

  private rethrowUniqueName(error: unknown): void {
    if (isUniqueNameViolation(error)) {
      throw new AppError(
        'ALREADY_EXISTS',
        'A menu item with this name already exists for the restaurant',
      );
    }
  }

  private bulkError(errors: BulkRowError[]): AppError {
    const sorted = [...errors].sort((a, b) => a.index - b.index);
    return new AppError('UNPROCESSABLE_ENTITY', 'Bulk menu has invalid rows', {
      errors: sorted,
    });
  }
}

function priceToDb(price: ReturnType<typeof parseReferencePrice>): bigint {
  return moneyTransformer.to(price) ?? 0n;
}

function isUniqueNameViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}
