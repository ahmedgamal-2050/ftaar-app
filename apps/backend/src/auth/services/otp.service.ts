import { Injectable, Logger } from '@nestjs/common';
import { createHmac, timingSafeEqual, randomInt } from 'node:crypto';
import { OtpPurpose, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AppConfigService } from '../../core/config/app-config.service';
import { AppError } from '../../core/errors/app-error';

export { OtpPurpose };

// Prisma transaction client — the type received inside a $transaction callback
export type PrismaTx = Prisma.TransactionClient;

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private readonly db: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  /**
   * Generates a cryptographically secure 6-digit OTP, stores its HMAC hash,
   * and returns the raw OTP (to be sent by email — never logged or stored raw).
   */
  async generate(
    userId: string,
    purpose: OtpPurpose,
    ttlMinutes: number,
  ): Promise<string> {
    const raw = String(randomInt(100_000, 1_000_000)); // always 6 digits
    const otpHash = this.hashOtp(raw);
    const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);

    await this.db.otpVerification.create({
      data: { userId, purpose, otpHash, expiresAt },
    });

    return raw;
  }

  /**
   * Returns true if a recent unconsumed OTP exists within the cooldown window.
   * Used to throttle resend requests.
   */
  async isWithinResendCooldown(
    userId: string,
    purpose: OtpPurpose,
    cooldownSeconds: number,
  ): Promise<boolean> {
    const since = new Date(Date.now() - cooldownSeconds * 1_000);
    const recent = await this.db.otpVerification.findFirst({
      where: { userId, purpose, consumedAt: null, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
    });
    return recent !== null;
  }

  /**
   * Marks all unconsumed OTPs for this user+purpose as consumed.
   * Call before issuing a new OTP (resend / re-register / re-forgot-password).
   */
  async invalidateActive(userId: string, purpose: OtpPurpose): Promise<void> {
    await this.db.otpVerification.updateMany({
      where: { userId, purpose, consumedAt: null },
      data: { consumedAt: new Date() },
    });
  }

  /**
   * Validates a submitted OTP.
   * - Increments attempt counter before comparing (prevents retry-on-error abuse).
   * - Throws typed AppErrors on all failure cases.
   * - Returns the OTP record id on success (caller must call consume() in a transaction).
   */
  async validate(
    userId: string,
    purpose: OtpPurpose,
    rawOtp: string,
    maxAttempts: number,
  ): Promise<string> {
    const record = await this.db.otpVerification.findFirst({
      where: { userId, purpose, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      throw new AppError('INVALID_OTP', 'No active verification code found');
    }

    if (record.expiresAt < new Date()) {
      throw new AppError('OTP_EXPIRED', 'Verification code has expired');
    }

    if (record.attempts >= maxAttempts) {
      throw new AppError(
        'OTP_TOO_MANY_ATTEMPTS',
        'Too many failed verification attempts. Request a new code.',
      );
    }

    // Increment attempts before comparing — prevents brute-force via retry
    const updated = await this.db.otpVerification.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });

    const submittedHash = this.hashOtp(rawOtp);
    const storedHash = record.otpHash;

    const isValid = this.constantTimeCompareHex(submittedHash, storedHash);

    if (!isValid) {
      if (updated.attempts >= maxAttempts) {
        throw new AppError(
          'OTP_TOO_MANY_ATTEMPTS',
          'Too many failed verification attempts. Request a new code.',
        );
      }
      throw new AppError('INVALID_OTP', 'Invalid verification code');
    }

    return record.id;
  }

  /**
   * Marks an OTP as consumed. Must be called inside a $transaction alongside
   * any other state changes (e.g. emailVerifiedAt) to keep them atomic.
   */
  async consume(otpId: string, tx: PrismaTx): Promise<void> {
    await tx.otpVerification.update({
      where: { id: otpId },
      data: { consumedAt: new Date() },
    });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private hashOtp(otp: string): string {
    return createHmac('sha256', this.config.emailOtpSecret)
      .update(otp)
      .digest('hex');
  }

  private constantTimeCompareHex(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  }
}
