import type { Restaurant as PrismaRestaurant } from '@prisma/client';

export type RestaurantProps = {
  id: string;
  name: string;
  phone: string;
  image: string;
  note: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export class Restaurant {
  readonly id: string;
  readonly name: string;
  readonly phone: string;
  readonly image: string;
  readonly note: string | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: RestaurantProps) {
    this.id = props.id;
    this.name = props.name;
    this.phone = props.phone;
    this.image = props.image;
    this.note = props.note;
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static fromPersistence(row: PrismaRestaurant): Restaurant {
    return new Restaurant({
      id: row.id,
      name: row.name,
      phone: row.phone,
      image: row.image,
      note: row.note,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  toResponse(menu?: unknown[]) {
    return {
      id: this.id,
      name: this.name,
      phone: this.phone,
      image: this.image,
      note: this.note,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      ...(menu !== undefined ? { menu } : {}),
    };
  }
}

/** Lobbies that still use the restaurant (REST-05). */
export const ACTIVE_LOBBY_STATUSES = ['open', 'locked', 'billed'] as const;

export const LIST_MAX_LIMIT = 100;
export const LIST_DEFAULT_LIMIT = 20;
export const NAME_MIN_LENGTH = 2;
export const PHONE_MIN_LENGTH = 5;
export const IMAGE_MIN_LENGTH = 1;
