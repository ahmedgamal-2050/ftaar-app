import { Injectable, Optional } from '@nestjs/common';
import { AppError } from '../core/errors/app-error';
import { PrismaService } from '../database/prisma.service';
import type { EntityManager } from '../shared/run-in-transaction';

/** CSV "arrived" is stored as locked until a dedicated status exists (MEM). */
export const BILLING_ARRIVED_STATUS = 'locked' as const;
export const BILLING_PAYMENT_STATUS = 'billed' as const;

@Injectable()
export class LobbyAccessService {
  constructor(@Optional() private readonly prisma?: PrismaService) {}

  private db(): PrismaService {
    if (!this.prisma) {
      throw new AppError('SERVICE_UNAVAILABLE', 'Database is not configured');
    }
    return this.prisma;
  }

  async requireMember(
    lobbyId: string,
    userId: string,
    em: EntityManager | PrismaService = this.db(),
  ) {
    const membership = await em.lobbyMember.findFirst({
      where: { lobbyId, userId },
      include: { lobby: true },
    });
    if (!membership) {
      throw new AppError('FORBIDDEN', 'Not a member of this lobby');
    }
    return membership;
  }

  async requireAdmin(
    lobbyId: string,
    userId: string,
    em: EntityManager | PrismaService = this.db(),
  ) {
    const membership = await this.requireMember(lobbyId, userId, em);
    if (membership.role !== 'admin') {
      throw new AppError('FORBIDDEN', 'Admin only');
    }
    return membership;
  }
}
