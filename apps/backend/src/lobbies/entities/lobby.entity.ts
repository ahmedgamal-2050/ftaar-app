import type {
  Lobby as PrismaLobby,
  LobbyMember as PrismaLobbyMember,
  LobbyStatus,
  Restaurant as PrismaRestaurant,
} from '@prisma/client';
import { LobbyMember } from './lobby-member.entity';

export type LobbyRestaurantSummary = {
  id: string;
  name: string;
  isActive: boolean;
};

export type LobbyProps = {
  id: string;
  restaurantId: string;
  code: string;
  status: LobbyStatus;
  maxMembers: number | null;
  expiresAt: Date | null;
  instaPayHandle: string | null;
  createdAt: Date;
  updatedAt: Date;
  restaurant?: LobbyRestaurantSummary;
  members?: LobbyMember[];
};

export class Lobby {
  readonly id: string;
  readonly restaurantId: string;
  readonly code: string;
  readonly status: LobbyStatus;
  readonly maxMembers: number | null;
  readonly expiresAt: Date | null;
  readonly instaPayHandle: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly restaurant?: LobbyRestaurantSummary;
  readonly members: LobbyMember[];

  private constructor(props: LobbyProps) {
    this.id = props.id;
    this.restaurantId = props.restaurantId;
    this.code = props.code;
    this.status = props.status;
    this.maxMembers = props.maxMembers;
    this.expiresAt = props.expiresAt;
    this.instaPayHandle = props.instaPayHandle;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.restaurant = props.restaurant;
    this.members = props.members ?? [];
  }

  get memberCount(): number {
    return this.members.length;
  }

  static fromPersistence(
    row: PrismaLobby & {
      restaurant?: PrismaRestaurant;
      members?: PrismaLobbyMember[];
    },
  ): Lobby {
    return new Lobby({
      id: row.id,
      restaurantId: row.restaurantId,
      code: row.code,
      status: row.status,
      maxMembers: row.maxMembers,
      expiresAt: row.expiresAt,
      instaPayHandle: row.instaPayHandle,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      restaurant: row.restaurant
        ? {
            id: row.restaurant.id,
            name: row.restaurant.name,
            isActive: row.restaurant.isActive,
          }
        : undefined,
      members: (row.members ?? []).map((member) =>
        LobbyMember.fromPersistence(member),
      ),
    });
  }

  toResponse() {
    return {
      id: this.id,
      restaurantId: this.restaurantId,
      code: this.code,
      status: this.status,
      maxMembers: this.maxMembers,
      expiresAt: this.expiresAt,
      instaPayHandle: this.instaPayHandle,
      memberCount: this.memberCount,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      ...(this.restaurant ? { restaurant: this.restaurant } : {}),
      members: this.members.map((member) => member.toResponse()),
    };
  }
}
