import { Injectable } from '@nestjs/common';
import type { Prisma, User } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export type SafeUser = Omit<User, 'passwordHash'>;

@Injectable()
export class UserRepositoryService {
  constructor(private readonly db: PrismaService) {}

  async findById(id: string): Promise<SafeUser | null> {
    const user = await this.db.user.findUnique({ where: { id } });
    return user ? this.strip(user) : null;
  }

  /** Case-insensitive email lookup. Returns user regardless of verification status. */
  async findByEmail(
    email: string,
  ): Promise<(SafeUser & { passwordHash: string | null }) | null> {
    const user = await this.db.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });
    return user ?? null;
  }

  /**
   * Finds a registered user that has NOT yet verified their email.
   * Used by the OTP verification flow.
   */
  async findUnverifiedByEmail(email: string): Promise<SafeUser | null> {
    const user = await this.db.user.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
        kind: 'registered',
        emailVerifiedAt: null,
      },
    });
    return user ? this.strip(user) : null;
  }

  async createGuest(): Promise<SafeUser> {
    const user = await this.db.user.create({
      data: { kind: 'guest', displayName: 'Guest' },
    });
    return this.strip(user);
  }

  /**
   * Creates an unverified registered user.
   * emailVerifiedAt remains null until the OTP flow completes.
   */
  async createRegistered(
    email: string,
    passwordHash: string,
    displayName: string,
  ): Promise<SafeUser> {
    const user = await this.db.user.create({
      data: {
        kind: 'registered',
        email: email.toLowerCase(),
        passwordHash,
        displayName,
      },
    });
    return this.strip(user);
  }

  /** Upgrades a guest to a registered user in-place, preserving the same userId. */
  async upgradeGuestToRegistered(
    userId: string,
    email: string,
    passwordHash: string,
  ): Promise<SafeUser> {
    const user = await this.db.user.update({
      where: { id: userId },
      data: {
        kind: 'registered',
        email: email.toLowerCase(),
        passwordHash,
        // Guests are already authenticated — mark their account as immediately verified
        emailVerifiedAt: new Date(),
      },
    });
    return this.strip(user);
  }

  async updateProfile(
    userId: string,
    data: { displayName?: string; instaPayHandle?: string | null },
  ): Promise<SafeUser> {
    const user = await this.db.user.update({
      where: { id: userId },
      data: data as Prisma.UserUpdateInput,
    });
    return this.strip(user);
  }

  async updatePasswordHash(
    userId: string,
    passwordHash: string,
  ): Promise<void> {
    await this.db.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  /** Strip the passwordHash before returning to callers. */
  private strip(user: User): SafeUser {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...safe } = user;
    return safe;
  }
}
