import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, randomUUID } from 'node:crypto';
import { PrismaService } from '../../database/prisma.service';
import { AppError } from '../../core/errors/app-error';
import { PasswordService } from './password.service';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly db: PrismaService,
    private readonly passwords: PasswordService,
  ) {}

  issueAccessToken(userId: string, kind: string): string {
    // exp and iat are set automatically by the JWT library via expiresIn
    const payload = {
      sub: userId,
      isGuest: kind === 'guest',
      jti: randomUUID(),
    };
    return this.jwt.sign(payload, { expiresIn: ACCESS_TOKEN_EXPIRY });
  }

  /**
   * Creates a new refresh token for the given user.
   * - Generates a cryptographically random token
   * - Stores its bcrypt hash in the DB
   * - Returns the raw token (sent once to the client)
   */
  async issueRefreshToken(userId: string, familyId?: string): Promise<string> {
    const raw = randomBytes(32).toString('hex');
    const tokenHash = await this.passwords.hash(raw);
    // familyId must be a UUID — PostgreSQL enforces this at the DB level.
    const family = familyId ?? randomUUID();

    await this.db.refreshToken.create({
      data: {
        userId,
        tokenHash,
        familyId: family,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
      },
    });

    // Encode familyId with the raw token so rotation can look up the record
    return `${family}:${raw}`;
  }

  /**
   * Validates and rotates a refresh token.
   * - Revokes the consumed token
   * - Issues a new token in the same family
   * - If the token was already revoked, revokes the entire family (reuse attack)
   */
  async rotateRefreshToken(
    rawToken: string,
  ): Promise<{ userId: string; newRawToken: string }> {
    const [familyId, raw] = this.splitToken(rawToken);

    // Find all tokens in this family, ordered by creation (newest first)
    const family = await this.db.refreshToken.findMany({
      where: { familyId },
      orderBy: { createdAt: 'desc' },
    });

    const latest = family[0];
    if (!latest) {
      throw new AppError('TOKEN_INVALID', 'Refresh token family not found');
    }

    // Check if any token in the family was already consumed/revoked — reuse attack
    const isReuse = latest.revokedAt !== null;

    if (isReuse) {
      this.logger.warn(
        `Refresh token reuse detected for family ${familyId} — revoking entire family`,
      );
      await this.revokeFamily(familyId);
      throw new AppError(
        'TOKEN_INVALID',
        'Refresh token has already been used. Please log in again.',
      );
    }

    if (latest.expiresAt < new Date()) {
      throw new AppError('TOKEN_EXPIRED', 'Refresh token has expired');
    }

    const isValid = await this.passwords.compare(raw, latest.tokenHash);
    if (!isValid) {
      throw new AppError('TOKEN_INVALID', 'Invalid refresh token');
    }

    // Revoke the current token and issue a new one in the same family
    await this.db.refreshToken.update({
      where: { id: latest.id },
      data: { revokedAt: new Date() },
    });

    const newRaw = await this.issueRefreshToken(latest.userId, familyId);
    return { userId: latest.userId, newRawToken: newRaw };
  }

  /** Revoke a specific refresh token family (e.g., on logout or reuse detection). */
  async revokeFamily(familyId: string): Promise<void> {
    await this.db.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Revoke a single token by its raw value (for logout).
   * Revokes the entire family for security — logging out on one device
   * invalidates all refresh tokens in that chain.
   */
  async revokeByRawToken(rawToken: string): Promise<void> {
    const [familyId] = this.splitToken(rawToken);
    await this.revokeFamily(familyId);
  }

  /**
   * Add an access token's JTI to the blocklist so it is rejected immediately,
   * even before its natural 15-minute expiry. Opportunistically cleans up
   * expired entries on each call.
   */
  async revokeAccessToken(jti: string, expiresAt: Date): Promise<void> {
    if (expiresAt <= new Date()) return; // already expired — nothing to block

    await this.db.revokedToken.upsert({
      where: { jti },
      create: { jti, expiresAt },
      update: {},
    });

    // Opportunistic cleanup: delete entries that have already expired
    await this.db.revokedToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  }

  /** Returns true if the JTI has been explicitly revoked. */
  async isAccessTokenRevoked(jti: string): Promise<boolean> {
    const entry = await this.db.revokedToken.findUnique({ where: { jti } });
    return entry !== null;
  }

  // ---------------------------------------------------------------------------
  // Password-reset tokens (opaque, one-time, short-lived)
  // ---------------------------------------------------------------------------

  /**
   * Issues an opaque password-reset token.
   * Returns the raw token in "tokenId:randomHex" format (never stored raw).
   */
  async issuePasswordResetToken(
    userId: string,
    ttlMinutes: number,
  ): Promise<string> {
    const raw = randomBytes(32).toString('hex');
    const tokenHash = await this.passwords.hash(raw);
    const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);

    const record = await this.db.passwordResetToken.create({
      data: { userId, tokenHash, expiresAt },
    });

    return `${record.id}:${raw}`;
  }

  /**
   * Validates a raw password-reset token.
   * Throws INVALID_RESET_TOKEN on any failure so callers receive a uniform error.
   * Returns { userId, tokenId } on success.
   */
  async validatePasswordResetToken(
    rawToken: string,
  ): Promise<{ userId: string; tokenId: string }> {
    const [tokenId, raw] = this.splitPasswordResetToken(rawToken);

    const record = await this.db.passwordResetToken.findUnique({
      where: { id: tokenId },
    });
    if (!record) {
      throw new AppError(
        'INVALID_RESET_TOKEN',
        'Password reset token is invalid',
      );
    }
    if (record.consumedAt !== null) {
      throw new AppError(
        'INVALID_RESET_TOKEN',
        'Password reset token has already been used',
      );
    }
    if (record.expiresAt < new Date()) {
      throw new AppError(
        'INVALID_RESET_TOKEN',
        'Password reset token has expired',
      );
    }

    const isValid = await this.passwords.compare(raw, record.tokenHash);
    if (!isValid) {
      throw new AppError(
        'INVALID_RESET_TOKEN',
        'Password reset token is invalid',
      );
    }

    return { userId: record.userId, tokenId: record.id };
  }

  /** Revoke all active refresh token families belonging to a user (e.g. after password reset). */
  async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    await this.db.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private splitPasswordResetToken(rawToken: string): [string, string] {
    const colonIdx = rawToken.indexOf(':');
    if (colonIdx === -1) {
      throw new AppError(
        'INVALID_RESET_TOKEN',
        'Malformed password reset token',
      );
    }
    return [rawToken.substring(0, colonIdx), rawToken.substring(colonIdx + 1)];
  }

  private splitToken(rawToken: string): [string, string] {
    const colonIdx = rawToken.indexOf(':');
    if (colonIdx === -1) {
      throw new AppError('TOKEN_INVALID', 'Malformed refresh token');
    }
    const familyId = rawToken.substring(0, colonIdx);
    const raw = rawToken.substring(colonIdx + 1);
    return [familyId, raw];
  }
}
