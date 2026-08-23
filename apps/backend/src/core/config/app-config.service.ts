import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvVars, LogLevel, NodeEnv } from './env.schema';

@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService<EnvVars, true>) {}

  get nodeEnv(): NodeEnv {
    return this.config.get('NODE_ENV', { infer: true });
  }

  get port(): number {
    return this.config.get('PORT', { infer: true });
  }

  get logLevel(): LogLevel {
    return this.config.get('LOG_LEVEL', { infer: true });
  }

  get databaseUrl(): string {
    return this.config.get('DATABASE_URL', { infer: true });
  }

  get jwtSecret(): string {
    return this.config.get('JWT_SECRET', { infer: true });
  }

  get corsOrigins(): string[] {
    return this.config
      .get('CORS_ORIGINS', { infer: true })
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0);
  }

  get bodyLimit(): string {
    return this.config.get('BODY_LIMIT', { infer: true });
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  // --- OTP ---
  get emailOtpSecret(): string {
    return this.config.get('EMAIL_OTP_SECRET', { infer: true });
  }

  get emailVerificationOtpTtlMinutes(): number {
    return this.config.get('EMAIL_VERIFICATION_OTP_TTL_MINUTES', {
      infer: true,
    });
  }

  get emailVerificationOtpMaxAttempts(): number {
    return this.config.get('EMAIL_VERIFICATION_OTP_MAX_ATTEMPTS', {
      infer: true,
    });
  }

  get emailVerificationOtpResendCooldownSeconds(): number {
    return this.config.get('EMAIL_VERIFICATION_OTP_RESEND_COOLDOWN_SECONDS', {
      infer: true,
    });
  }

  get passwordResetOtpTtlMinutes(): number {
    return this.config.get('PASSWORD_RESET_OTP_TTL_MINUTES', { infer: true });
  }

  get passwordResetOtpMaxAttempts(): number {
    return this.config.get('PASSWORD_RESET_OTP_MAX_ATTEMPTS', { infer: true });
  }

  get passwordResetOtpResendCooldownSeconds(): number {
    return this.config.get('PASSWORD_RESET_OTP_RESEND_COOLDOWN_SECONDS', {
      infer: true,
    });
  }

  get passwordResetTokenTtlMinutes(): number {
    return this.config.get('PASSWORD_RESET_TOKEN_TTL_MINUTES', { infer: true });
  }

  // --- SMTP ---
  get smtpHost(): string {
    return this.config.get('SMTP_HOST', { infer: true });
  }

  get smtpPort(): number {
    return this.config.get('SMTP_PORT', { infer: true });
  }

  get smtpUser(): string {
    return this.config.get('SMTP_USER', { infer: true });
  }

  get smtpPass(): string {
    return this.config.get('SMTP_PASS', { infer: true });
  }

  get mailFrom(): string {
    return this.config.get('MAIL_FROM', { infer: true });
  }
}
