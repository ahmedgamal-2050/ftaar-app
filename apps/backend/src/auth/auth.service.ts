import { Injectable, Logger } from '@nestjs/common';
import type { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { AppError } from '../core/errors/app-error';
import type { SafeUser } from './services/user-repository.service';
import { UserRepositoryService } from './services/user-repository.service';
import { PasswordService } from './services/password.service';
import { TokenService, type TokenPair } from './services/token.service';
import { OtpService, OtpPurpose } from './services/otp.service';
import { MailService } from './services/mail.service';
import { AppConfigService } from '../core/config/app-config.service';
import { PrismaService } from '../database/prisma.service';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type { RefreshDto } from './dto/refresh.dto';
import type { LogoutDto } from './dto/logout.dto';
import type { UpdateMeDto } from './dto/update-me.dto';
import type { VerifyOtpDto } from './dto/verify-otp.dto';
import type { ResendOtpDto } from './dto/resend-otp.dto';
import type { ForgotPasswordDto } from './dto/forgot-password.dto';
import type { ResetPasswordDto } from './dto/reset-password.dto';

export interface AuthResponse extends TokenPair {
  user: SafeUser;
}

export interface RegistrationPendingResponse {
  verificationRequired: true;
  email: string;
}

export interface MessageResponse {
  message: string;
}

export interface ResetTokenResponse {
  resetToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly users: UserRepositoryService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly otp: OtpService,
    private readonly mail: MailService,
    private readonly config: AppConfigService,
    private readonly db: PrismaService,
  ) {}

  // ---------------------------------------------------------------------------
  // AUTH-10: Guest
  // ---------------------------------------------------------------------------

  /**
   * Create a new anonymous guest user.
   * The backend generates the identity — no client input required.
   */
  async guest(): Promise<AuthResponse> {
    const user = await this.users.createGuest();
    return this.buildTokenPair(user);
  }

  // ---------------------------------------------------------------------------
  // AUTH-11: Register (OTP-gated)
  // ---------------------------------------------------------------------------

  /**
   * Start registration: create an unverified user, generate + send OTP.
   * Does NOT issue tokens. The client must call verifyRegistrationOtp() next.
   *
   * Idempotent for unverified users — resends the OTP without revealing whether
   * the email is new or pending, preventing account enumeration.
   */
  async register(dto: RegisterDto): Promise<RegistrationPendingResponse> {
    const email = dto.email.trim().toLowerCase();

    // Check for an already-verified account
    const existing = await this.users.findByEmail(email);
    if (existing && existing.emailVerifiedAt !== null) {
      throw new AppError(
        'EMAIL_ALREADY_REGISTERED',
        'An account with this email already exists',
      );
    }

    let user: SafeUser;

    if (existing) {
      // Unverified account already exists — reuse it (invalidate old OTPs below)
      user = existing;
    } else {
      // Create a new unverified user
      const passwordHash = await this.passwords.hash(dto.password);
      try {
        user = await this.users.createRegistered(
          email,
          passwordHash,
          email.split('@')[0] ?? email,
        );
      } catch (err) {
        if ((err as PrismaClientKnownRequestError).code === 'P2002') {
          throw new AppError(
            'EMAIL_ALREADY_REGISTERED',
            'An account with this email already exists',
          );
        }
        throw err;
      }
    }

    await this.issueVerificationOtp(user.id, email);

    return { verificationRequired: true, email };
  }

  /**
   * AUTH-11b: Verify the registration OTP and issue tokens.
   * Marks emailVerifiedAt and consumes the OTP in a single transaction.
   */
  async verifyRegistrationOtp(dto: VerifyOtpDto): Promise<AuthResponse> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.users.findUnverifiedByEmail(email);

    if (!user) {
      throw new AppError(
        'NOT_FOUND',
        'No pending registration found for this email',
      );
    }

    const maxAttempts = this.config.emailVerificationOtpMaxAttempts;
    const otpId = await this.otp.validate(
      user.id,
      OtpPurpose.EMAIL_VERIFICATION,
      dto.otp,
      maxAttempts,
    );

    // Consume OTP and mark email as verified atomically
    await this.db.$transaction(async (tx) => {
      await this.otp.consume(otpId, tx);
      await tx.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: new Date() },
      });
    });

    const verifiedUser = await this.users.findById(user.id);
    if (!verifiedUser) throw new AppError('USER_NOT_FOUND');
    return this.buildTokenPair(verifiedUser);
  }

  /**
   * AUTH-11c: Resend registration OTP with cooldown enforcement.
   * Returns a generic response regardless of whether the email exists.
   */
  async resendRegistrationOtp(dto: ResendOtpDto): Promise<MessageResponse> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.users.findUnverifiedByEmail(email);

    const genericResponse: MessageResponse = {
      message:
        'If a pending registration exists for this email, a new verification code has been sent.',
    };

    if (!user) {
      // Silently succeed — don't reveal registration state
      return genericResponse;
    }

    const cooldown = this.config.emailVerificationOtpResendCooldownSeconds;
    const withinCooldown = await this.otp.isWithinResendCooldown(
      user.id,
      OtpPurpose.EMAIL_VERIFICATION,
      cooldown,
    );

    if (withinCooldown) {
      throw new AppError(
        'OTP_RESEND_COOLDOWN',
        `Please wait ${cooldown} seconds before requesting a new code`,
      );
    }

    await this.issueVerificationOtp(user.id, email);

    return genericResponse;
  }

  // ---------------------------------------------------------------------------
  // AUTH-12: Convert guest → registered
  // ---------------------------------------------------------------------------

  async convert(
    userId: string,
    currentKind: string,
    dto: RegisterDto,
  ): Promise<AuthResponse> {
    if (currentKind !== 'guest') {
      throw new AppError('FORBIDDEN', 'Only guest accounts can be converted');
    }

    const email = dto.email.trim().toLowerCase();
    const existing = await this.users.findByEmail(email);
    if (existing) {
      throw new AppError(
        'EMAIL_ALREADY_REGISTERED',
        'An account with this email already exists',
      );
    }

    const passwordHash = await this.passwords.hash(dto.password);
    try {
      const user = await this.users.upgradeGuestToRegistered(
        userId,
        email,
        passwordHash,
      );
      return this.buildTokenPair(user);
    } catch (err) {
      if ((err as PrismaClientKnownRequestError).code === 'P2002') {
        throw new AppError(
          'EMAIL_ALREADY_REGISTERED',
          'An account with this email already exists',
        );
      }
      throw err;
    }
  }

  // ---------------------------------------------------------------------------
  // AUTH-13: Login (blocks unverified users)
  // ---------------------------------------------------------------------------

  async login(dto: LoginDto): Promise<AuthResponse> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.users.findByEmail(email);

    if (!user || !user.passwordHash) {
      await this.passwords.dummyCompare();
      throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const valid = await this.passwords.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password');
    }

    // Registered users must verify their email before logging in
    if (user.kind === 'registered' && user.emailVerifiedAt === null) {
      throw new AppError(
        'EMAIL_NOT_VERIFIED',
        'Please verify your email address before logging in',
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return this.buildTokenPair(safeUser);
  }

  // ---------------------------------------------------------------------------
  // AUTH-14/15: Refresh / Logout
  // ---------------------------------------------------------------------------

  async refresh(dto: RefreshDto): Promise<TokenPair> {
    const { userId, newRawToken } = await this.tokens.rotateRefreshToken(
      dto.refreshToken,
    );
    const user = await this.users.findById(userId);

    if (!user) {
      throw new AppError('TOKEN_INVALID', 'Token subject not found');
    }

    return {
      accessToken: this.tokens.issueAccessToken(user.id, user.kind),
      refreshToken: newRawToken,
    };
  }

  async logout(
    jti: string,
    tokenExpiresAt: Date,
    dto: LogoutDto,
  ): Promise<void> {
    await Promise.all([
      this.tokens.revokeByRawToken(dto.refreshToken),
      this.tokens.revokeAccessToken(jti, tokenExpiresAt),
    ]);
  }

  // ---------------------------------------------------------------------------
  // USER-01/02/03: Profile
  // ---------------------------------------------------------------------------

  async getMe(userId: string): Promise<SafeUser> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new AppError('NOT_FOUND', 'User not found');
    }
    return user;
  }

  async updateMe(userId: string, dto: UpdateMeDto): Promise<SafeUser> {
    return this.users.updateProfile(userId, {
      displayName: dto.displayName,
      instaPayHandle: dto.instaPayHandle,
    });
  }

  // ---------------------------------------------------------------------------
  // Forgot Password flow
  // ---------------------------------------------------------------------------

  /**
   * Sends a PASSWORD_RESET OTP to the given email.
   * Always returns the same generic response to prevent account enumeration.
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<MessageResponse> {
    const email = dto.email.trim().toLowerCase();
    const genericResponse: MessageResponse = {
      message:
        'If an account exists for this email, a password reset code has been sent.',
    };

    const user = await this.users.findByEmail(email);

    // Silently succeed for unknown emails, guests (no email), or unverified accounts
    if (!user || user.kind !== 'registered' || user.emailVerifiedAt === null) {
      return genericResponse;
    }

    const cooldown = this.config.passwordResetOtpResendCooldownSeconds;
    const withinCooldown = await this.otp.isWithinResendCooldown(
      user.id,
      OtpPurpose.PASSWORD_RESET,
      cooldown,
    );

    if (withinCooldown) {
      // Still return the generic response — don't leak cooldown state to anonymous callers
      return genericResponse;
    }

    await this.otp.invalidateActive(user.id, OtpPurpose.PASSWORD_RESET);

    const ttl = this.config.passwordResetOtpTtlMinutes;
    const rawOtp = await this.otp.generate(
      user.id,
      OtpPurpose.PASSWORD_RESET,
      ttl,
    );

    await this.mail.sendPasswordResetOtp(email, rawOtp, ttl);

    return genericResponse;
  }

  /**
   * Verifies the PASSWORD_RESET OTP and issues a short-lived opaque reset token.
   * Does NOT issue normal access/refresh tokens.
   */
  async verifyForgotPasswordOtp(
    dto: VerifyOtpDto,
  ): Promise<ResetTokenResponse> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.users.findByEmail(email);

    if (!user || user.kind !== 'registered') {
      throw new AppError('INVALID_OTP', 'Invalid verification code');
    }

    const maxAttempts = this.config.passwordResetOtpMaxAttempts;
    const otpId = await this.otp.validate(
      user.id,
      OtpPurpose.PASSWORD_RESET,
      dto.otp,
      maxAttempts,
    );

    const ttl = this.config.passwordResetTokenTtlMinutes;

    // Consume OTP and issue reset token atomically
    let resetToken!: string;
    await this.db.$transaction(async (tx) => {
      await this.otp.consume(otpId, tx);
      resetToken = await this.tokens.issuePasswordResetToken(user.id, ttl);
    });

    return { resetToken };
  }

  /**
   * Resets the user's password using the one-time reset token.
   * Revokes all existing refresh token families after success.
   */
  async resetPassword(dto: ResetPasswordDto): Promise<MessageResponse> {
    const { userId, tokenId } = await this.tokens.validatePasswordResetToken(
      dto.resetToken,
    );

    const passwordHash = await this.passwords.hash(dto.newPassword);

    // Update password + consume reset token + revoke refresh tokens — atomically
    await this.db.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { passwordHash } });
      await tx.passwordResetToken.update({
        where: { id: tokenId },
        data: { consumedAt: new Date() },
      });
      // Invalidate any remaining PASSWORD_RESET OTPs for this user
      await tx.otpVerification.updateMany({
        where: { userId, purpose: OtpPurpose.PASSWORD_RESET, consumedAt: null },
        data: { consumedAt: new Date() },
      });
      // Revoke all existing refresh sessions
      await tx.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });

    return { message: 'Password has been reset successfully.' };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async issueVerificationOtp(
    userId: string,
    email: string,
  ): Promise<void> {
    await this.otp.invalidateActive(userId, OtpPurpose.EMAIL_VERIFICATION);
    const ttl = this.config.emailVerificationOtpTtlMinutes;
    const rawOtp = await this.otp.generate(
      userId,
      OtpPurpose.EMAIL_VERIFICATION,
      ttl,
    );
    await this.mail.sendEmailVerificationOtp(email, rawOtp, ttl);
  }

  private async buildTokenPair(user: SafeUser): Promise<AuthResponse> {
    const accessToken = this.tokens.issueAccessToken(user.id, user.kind);
    const refreshToken = await this.tokens.issueRefreshToken(user.id);
    return { accessToken, refreshToken, user };
  }
}
