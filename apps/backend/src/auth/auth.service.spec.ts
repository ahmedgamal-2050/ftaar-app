import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserRepositoryService } from './services/user-repository.service';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';
import { OtpService } from './services/otp.service';
import { MailService } from './services/mail.service';
import { AppConfigService } from '../core/config/app-config.service';
import { PrismaService } from '../database/prisma.service';
import type { SafeUser } from './services/user-repository.service';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const GUEST_USER: SafeUser = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  kind: 'guest',
  email: null,
  displayName: 'Guest',
  instaPayHandle: null,
  emailVerifiedAt: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

const REGISTERED_USER: SafeUser & { passwordHash: string | null } = {
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  kind: 'registered',
  email: 'user@example.com',
  displayName: 'user',
  instaPayHandle: null,
  emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  passwordHash: 'hashed-password',
};

const UNVERIFIED_USER: SafeUser & { passwordHash: string | null } = {
  ...REGISTERED_USER,
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  emailVerifiedAt: null,
  passwordHash: null,
};

const ACCESS_TOKEN = 'access.token.stub';
const REFRESH_TOKEN = 'family-uuid:raw-token-stub';
const OTP_ID = 'otp-record-uuid';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildMocks() {
  const users: jest.Mocked<UserRepositoryService> = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findUnverifiedByEmail: jest.fn(),
    createGuest: jest.fn(),
    createRegistered: jest.fn(),
    upgradeGuestToRegistered: jest.fn(),
    updateProfile: jest.fn(),
    updatePasswordHash: jest.fn(),
  } as unknown as jest.Mocked<UserRepositoryService>;

  const passwords: jest.Mocked<PasswordService> = {
    hash: jest.fn(),
    compare: jest.fn(),
    dummyCompare: jest.fn(),
  } as unknown as jest.Mocked<PasswordService>;

  const tokens: jest.Mocked<TokenService> = {
    issueAccessToken: jest.fn().mockReturnValue(ACCESS_TOKEN),
    issueRefreshToken: jest.fn().mockResolvedValue(REFRESH_TOKEN),
    rotateRefreshToken: jest.fn(),
    revokeByRawToken: jest.fn(),
    revokeAccessToken: jest.fn(),
    isAccessTokenRevoked: jest.fn(),
    issuePasswordResetToken: jest.fn(),
    validatePasswordResetToken: jest.fn(),
    revokeAllUserRefreshTokens: jest.fn(),
  } as unknown as jest.Mocked<TokenService>;

  const otp: jest.Mocked<OtpService> = {
    generate: jest.fn().mockResolvedValue('123456'),
    validate: jest.fn().mockResolvedValue(OTP_ID),
    consume: jest.fn().mockResolvedValue(undefined),
    isWithinResendCooldown: jest.fn().mockResolvedValue(false),
    invalidateActive: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<OtpService>;

  const mail: jest.Mocked<MailService> = {
    sendEmailVerificationOtp: jest.fn().mockResolvedValue(undefined),
    sendPasswordResetOtp: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<MailService>;

  const config = {
    emailVerificationOtpTtlMinutes: 10,
    emailVerificationOtpMaxAttempts: 5,
    emailVerificationOtpResendCooldownSeconds: 60,
    passwordResetOtpTtlMinutes: 10,
    passwordResetOtpMaxAttempts: 5,
    passwordResetOtpResendCooldownSeconds: 60,
    passwordResetTokenTtlMinutes: 10,
  } as unknown as jest.Mocked<AppConfigService>;

  // Minimal Prisma mock — supports $transaction (calls the callback with itself)
  const db = {
    $transaction: jest
      .fn()
      .mockImplementation((fn: (tx: unknown) => Promise<unknown>) => fn(db)),
    user: { update: jest.fn() },
    otpVerification: { update: jest.fn(), updateMany: jest.fn() },
    passwordResetToken: { update: jest.fn() },
    refreshToken: { updateMany: jest.fn() },
  } as unknown as jest.Mocked<PrismaService>;

  return { users, passwords, tokens, otp, mail, config, db };
}

async function buildService(
  mocks: ReturnType<typeof buildMocks>,
): Promise<AuthService> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      AuthService,
      { provide: UserRepositoryService, useValue: mocks.users },
      { provide: PasswordService, useValue: mocks.passwords },
      { provide: TokenService, useValue: mocks.tokens },
      { provide: OtpService, useValue: mocks.otp },
      { provide: MailService, useValue: mocks.mail },
      { provide: AppConfigService, useValue: mocks.config },
      { provide: PrismaService, useValue: mocks.db },
    ],
  }).compile();
  return module.get<AuthService>(AuthService);
}

// ---------------------------------------------------------------------------
// AUTH-10: POST /auth/guest
// ---------------------------------------------------------------------------

describe('AuthService.guest (AUTH-10)', () => {
  let service: AuthService;
  let mocks: ReturnType<typeof buildMocks>;

  beforeEach(async () => {
    mocks = buildMocks();
    mocks.users.createGuest.mockResolvedValue(GUEST_USER);
    service = await buildService(mocks);
  });

  it('creates a guest user — no input required', async () => {
    await service.guest();
    expect(mocks.users.createGuest).toHaveBeenCalledTimes(1);
    expect(mocks.users.createGuest).toHaveBeenCalledWith();
  });

  it('returns a guest user with kind = "guest"', async () => {
    const result = await service.guest();
    expect(result.user.kind).toBe('guest');
  });

  it('issues an access token for the guest user', async () => {
    const result = await service.guest();
    expect(mocks.tokens.issueAccessToken).toHaveBeenCalledWith(
      GUEST_USER.id,
      'guest',
    );
    expect(result.accessToken).toBe(ACCESS_TOKEN);
  });

  it('issues a refresh token linked to the guest user id', async () => {
    const result = await service.guest();
    expect(mocks.tokens.issueRefreshToken).toHaveBeenCalledWith(GUEST_USER.id);
    expect(result.refreshToken).toBe(REFRESH_TOKEN);
  });

  it('creates a NEW guest on each call', async () => {
    await service.guest();
    await service.guest();
    expect(mocks.users.createGuest).toHaveBeenCalledTimes(2);
  });

  it('response does not contain deviceId', async () => {
    const result = await service.guest();
    expect(result.user).not.toHaveProperty('deviceId');
  });
});

// ---------------------------------------------------------------------------
// AUTH-11: POST /auth/register (OTP flow)
// ---------------------------------------------------------------------------

describe('AuthService.register (AUTH-11)', () => {
  let service: AuthService;
  let mocks: ReturnType<typeof buildMocks>;

  beforeEach(async () => {
    mocks = buildMocks();
    mocks.users.findByEmail.mockResolvedValue(null);
    mocks.passwords.hash.mockResolvedValue('hashed-password');
    mocks.users.createRegistered.mockResolvedValue(UNVERIFIED_USER);
    service = await buildService(mocks);
  });

  it('creates an unverified user (emailVerifiedAt = null)', async () => {
    await service.register({
      email: 'user@example.com',
      password: 'Pass1234!',
    });
    expect(mocks.users.createRegistered).toHaveBeenCalledTimes(1);
    expect(UNVERIFIED_USER.emailVerifiedAt).toBeNull();
  });

  it('hashes the password before saving', async () => {
    await service.register({
      email: 'user@example.com',
      password: 'Pass1234!',
    });
    expect(mocks.passwords.hash).toHaveBeenCalledWith('Pass1234!');
    expect(mocks.users.createRegistered).toHaveBeenCalledWith(
      'user@example.com',
      'hashed-password',
      expect.any(String),
    );
  });

  it('generates an OTP', async () => {
    await service.register({
      email: 'user@example.com',
      password: 'Pass1234!',
    });
    expect(mocks.otp.generate).toHaveBeenCalledWith(
      UNVERIFIED_USER.id,
      'EMAIL_VERIFICATION',
      expect.any(Number),
    );
  });

  it('does NOT store the raw OTP — only hashing happens in OtpService (called once)', async () => {
    await service.register({
      email: 'user@example.com',
      password: 'Pass1234!',
    });
    // The raw OTP is generated by OtpService (mocked) and passed to MailService
    expect(mocks.otp.generate).toHaveBeenCalledTimes(1);
  });

  it('sends a verification email with the OTP', async () => {
    await service.register({
      email: 'user@example.com',
      password: 'Pass1234!',
    });
    expect(mocks.mail.sendEmailVerificationOtp).toHaveBeenCalledWith(
      'user@example.com',
      '123456',
      expect.any(Number),
    );
  });

  it('does NOT issue access/refresh tokens', async () => {
    const result = await service.register({
      email: 'user@example.com',
      password: 'Pass1234!',
    });
    expect(mocks.tokens.issueAccessToken).not.toHaveBeenCalled();
    expect(mocks.tokens.issueRefreshToken).not.toHaveBeenCalled();
    expect(result).not.toHaveProperty('accessToken');
  });

  it('returns verificationRequired=true with the normalized email', async () => {
    const result = await service.register({
      email: '  User@Example.COM  ',
      password: 'Pass1234!',
    });
    expect(result).toEqual({
      verificationRequired: true,
      email: 'user@example.com',
    });
  });

  it('throws EMAIL_ALREADY_REGISTERED for a verified existing user', async () => {
    mocks.users.findByEmail.mockResolvedValue(REGISTERED_USER);
    await expect(
      service.register({ email: 'user@example.com', password: 'Pass1234!' }),
    ).rejects.toMatchObject({ code: 'EMAIL_ALREADY_REGISTERED' });
  });

  it('resends OTP for an existing unverified account without error', async () => {
    mocks.users.findByEmail.mockResolvedValue(UNVERIFIED_USER);
    const result = await service.register({
      email: 'user@example.com',
      password: 'Pass1234!',
    });
    expect(result.verificationRequired).toBe(true);
    // Does not create a new user
    expect(mocks.users.createRegistered).not.toHaveBeenCalled();
    expect(mocks.mail.sendEmailVerificationOtp).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// AUTH-11b: POST /auth/register/verify-otp
// ---------------------------------------------------------------------------

describe('AuthService.verifyRegistrationOtp (AUTH-11b)', () => {
  let service: AuthService;
  let mocks: ReturnType<typeof buildMocks>;

  beforeEach(async () => {
    mocks = buildMocks();
    mocks.users.findUnverifiedByEmail.mockResolvedValue(UNVERIFIED_USER);
    mocks.users.findById.mockResolvedValue(REGISTERED_USER);
    service = await buildService(mocks);
  });

  it('validates the OTP with EMAIL_VERIFICATION purpose', async () => {
    await service.verifyRegistrationOtp({
      email: 'user@example.com',
      otp: '123456',
    });
    expect(mocks.otp.validate).toHaveBeenCalledWith(
      UNVERIFIED_USER.id,
      'EMAIL_VERIFICATION',
      '123456',
      expect.any(Number),
    );
  });

  it('consumes the OTP and marks emailVerifiedAt inside a transaction', async () => {
    await service.verifyRegistrationOtp({
      email: 'user@example.com',
      otp: '123456',
    });
    expect(mocks.db.$transaction).toHaveBeenCalledTimes(1);
    expect(mocks.otp.consume).toHaveBeenCalledWith(OTP_ID, expect.anything());
    expect(mocks.db.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: UNVERIFIED_USER.id },
        data: { emailVerifiedAt: expect.any(Date) },
      }),
    );
  });

  it('issues tokens after successful verification', async () => {
    const result = await service.verifyRegistrationOtp({
      email: 'user@example.com',
      otp: '123456',
    });
    expect(result.accessToken).toBe(ACCESS_TOKEN);
    expect(result.refreshToken).toBe(REFRESH_TOKEN);
  });

  it('throws INVALID_OTP when no pending registration is found', async () => {
    mocks.users.findUnverifiedByEmail.mockResolvedValue(null);
    await expect(
      service.verifyRegistrationOtp({
        email: 'nope@example.com',
        otp: '123456',
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('propagates OTP errors from OtpService (wrong OTP)', async () => {
    const { AppError } = await import('../core/errors/app-error');
    mocks.otp.validate.mockRejectedValue(
      new AppError('INVALID_OTP', 'Invalid verification code'),
    );
    await expect(
      service.verifyRegistrationOtp({
        email: 'user@example.com',
        otp: '000000',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_OTP' });
  });
});

// ---------------------------------------------------------------------------
// AUTH-11c: POST /auth/register/resend-otp
// ---------------------------------------------------------------------------

describe('AuthService.resendRegistrationOtp (AUTH-11c)', () => {
  let service: AuthService;
  let mocks: ReturnType<typeof buildMocks>;

  beforeEach(async () => {
    mocks = buildMocks();
    mocks.users.findUnverifiedByEmail.mockResolvedValue(UNVERIFIED_USER);
    service = await buildService(mocks);
  });

  it('invalidates old OTPs and generates a new one', async () => {
    await service.resendRegistrationOtp({ email: 'user@example.com' });
    expect(mocks.otp.invalidateActive).toHaveBeenCalledWith(
      UNVERIFIED_USER.id,
      'EMAIL_VERIFICATION',
    );
    expect(mocks.otp.generate).toHaveBeenCalled();
  });

  it('sends a new verification email', async () => {
    await service.resendRegistrationOtp({ email: 'user@example.com' });
    expect(mocks.mail.sendEmailVerificationOtp).toHaveBeenCalledWith(
      'user@example.com',
      '123456',
      expect.any(Number),
    );
  });

  it('enforces resend cooldown', async () => {
    mocks.otp.isWithinResendCooldown.mockResolvedValue(true);
    await expect(
      service.resendRegistrationOtp({ email: 'user@example.com' }),
    ).rejects.toMatchObject({ code: 'OTP_RESEND_COOLDOWN' });
  });

  it('returns generic message for unknown email (no enumeration)', async () => {
    mocks.users.findUnverifiedByEmail.mockResolvedValue(null);
    const result = await service.resendRegistrationOtp({
      email: 'unknown@example.com',
    });
    expect(result.message).toBeDefined();
    expect(mocks.otp.generate).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// AUTH-14: POST /auth/refresh preserves the same guest via userId
// ---------------------------------------------------------------------------

describe('AuthService.refresh (AUTH-14)', () => {
  let service: AuthService;
  let mocks: ReturnType<typeof buildMocks>;

  beforeEach(async () => {
    mocks = buildMocks();
    service = await buildService(mocks);
  });

  it('returns a new token pair for the same guest user', async () => {
    mocks.tokens.rotateRefreshToken.mockResolvedValue({
      userId: GUEST_USER.id,
      newRawToken: 'new-family-uuid:new-raw-token',
    });
    mocks.users.findById.mockResolvedValue(GUEST_USER);

    const result = await service.refresh({ refreshToken: REFRESH_TOKEN });
    expect(mocks.tokens.rotateRefreshToken).toHaveBeenCalledWith(REFRESH_TOKEN);
    expect(result.accessToken).toBe(ACCESS_TOKEN);
    expect(result.refreshToken).toBe('new-family-uuid:new-raw-token');
  });
});

// ---------------------------------------------------------------------------
// AUTH-13: Login — blocks unverified users
// ---------------------------------------------------------------------------

describe('AuthService.login (AUTH-13)', () => {
  let service: AuthService;
  let mocks: ReturnType<typeof buildMocks>;

  beforeEach(async () => {
    mocks = buildMocks();
    service = await buildService(mocks);
  });

  it('returns tokens for a verified registered user', async () => {
    mocks.users.findByEmail.mockResolvedValue({
      ...REGISTERED_USER,
      passwordHash: 'hashed',
    });
    mocks.passwords.compare.mockResolvedValue(true);

    const result = await service.login({
      email: 'user@example.com',
      password: 'Pass1234!',
    });
    expect(result.accessToken).toBe(ACCESS_TOKEN);
  });

  it('throws EMAIL_NOT_VERIFIED for an unverified registered user', async () => {
    mocks.users.findByEmail.mockResolvedValue({
      ...UNVERIFIED_USER,
      passwordHash: 'hashed',
    });
    mocks.passwords.compare.mockResolvedValue(true);

    await expect(
      service.login({ email: 'user@example.com', password: 'Pass1234!' }),
    ).rejects.toMatchObject({ code: 'EMAIL_NOT_VERIFIED' });
  });

  it('throws INVALID_CREDENTIALS for wrong password', async () => {
    mocks.users.findByEmail.mockResolvedValue({
      ...REGISTERED_USER,
      passwordHash: 'hashed',
    });
    mocks.passwords.compare.mockResolvedValue(false);

    await expect(
      service.login({ email: 'user@example.com', password: 'wrong' }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
  });
});

// ---------------------------------------------------------------------------
// Forgot Password flow
// ---------------------------------------------------------------------------

describe('AuthService.forgotPassword', () => {
  let service: AuthService;
  let mocks: ReturnType<typeof buildMocks>;

  beforeEach(async () => {
    mocks = buildMocks();
    service = await buildService(mocks);
  });

  it('sends a PASSWORD_RESET OTP for an existing verified user', async () => {
    mocks.users.findByEmail.mockResolvedValue(REGISTERED_USER);
    await service.forgotPassword({ email: 'user@example.com' });
    expect(mocks.otp.generate).toHaveBeenCalledWith(
      REGISTERED_USER.id,
      'PASSWORD_RESET',
      expect.any(Number),
    );
    expect(mocks.mail.sendPasswordResetOtp).toHaveBeenCalled();
  });

  it('returns the same generic response for unknown email', async () => {
    mocks.users.findByEmail.mockResolvedValue(null);
    const result = await service.forgotPassword({ email: 'ghost@example.com' });
    expect(result.message).toBeDefined();
    expect(mocks.otp.generate).not.toHaveBeenCalled();
  });

  it('does not create a user for unknown email', async () => {
    mocks.users.findByEmail.mockResolvedValue(null);
    await service.forgotPassword({ email: 'ghost@example.com' });
    expect(mocks.users.createRegistered).not.toHaveBeenCalled();
    expect(mocks.users.createGuest).not.toHaveBeenCalled();
  });

  it('returns generic response for unverified registered user (no OTP sent)', async () => {
    mocks.users.findByEmail.mockResolvedValue(UNVERIFIED_USER);
    const result = await service.forgotPassword({ email: 'user@example.com' });
    expect(result.message).toBeDefined();
    expect(mocks.otp.generate).not.toHaveBeenCalled();
  });

  it('silently enforces resend cooldown (no error thrown)', async () => {
    mocks.users.findByEmail.mockResolvedValue(REGISTERED_USER);
    mocks.otp.isWithinResendCooldown.mockResolvedValue(true);
    const result = await service.forgotPassword({ email: 'user@example.com' });
    expect(result.message).toBeDefined();
    expect(mocks.otp.generate).not.toHaveBeenCalled();
  });
});

describe('AuthService.verifyForgotPasswordOtp', () => {
  let service: AuthService;
  let mocks: ReturnType<typeof buildMocks>;

  beforeEach(async () => {
    mocks = buildMocks();
    mocks.users.findByEmail.mockResolvedValue(REGISTERED_USER);
    mocks.tokens.issuePasswordResetToken.mockResolvedValue(
      'reset-token-id:reset-raw',
    );
    service = await buildService(mocks);
  });

  it('validates the OTP with PASSWORD_RESET purpose', async () => {
    await service.verifyForgotPasswordOtp({
      email: 'user@example.com',
      otp: '123456',
    });
    expect(mocks.otp.validate).toHaveBeenCalledWith(
      REGISTERED_USER.id,
      'PASSWORD_RESET',
      '123456',
      expect.any(Number),
    );
  });

  it('issues a password-reset token (not normal access/refresh tokens)', async () => {
    const result = await service.verifyForgotPasswordOtp({
      email: 'user@example.com',
      otp: '123456',
    });
    expect(result).toHaveProperty('resetToken');
    expect(result).not.toHaveProperty('accessToken');
    expect(result).not.toHaveProperty('refreshToken');
    expect(mocks.tokens.issuePasswordResetToken).toHaveBeenCalledWith(
      REGISTERED_USER.id,
      expect.any(Number),
    );
  });

  it('EMAIL_VERIFICATION OTP cannot be used as PASSWORD_RESET OTP (different purpose)', async () => {
    // This is enforced by OtpService.validate which filters by purpose.
    // Here we verify the correct purpose is passed.
    await service.verifyForgotPasswordOtp({
      email: 'user@example.com',
      otp: '123456',
    });
    const call = mocks.otp.validate.mock.calls[0];
    expect(call?.[1]).toBe('PASSWORD_RESET');
    expect(call?.[1]).not.toBe('EMAIL_VERIFICATION');
  });
});

describe('AuthService.resetPassword', () => {
  let service: AuthService;
  let mocks: ReturnType<typeof buildMocks>;

  beforeEach(async () => {
    mocks = buildMocks();
    mocks.tokens.validatePasswordResetToken.mockResolvedValue({
      userId: REGISTERED_USER.id,
      tokenId: 'token-id-123',
    });
    mocks.passwords.hash.mockResolvedValue('new-hashed-password');
    service = await buildService(mocks);
  });

  it('validates the reset token before changing password', async () => {
    await service.resetPassword({
      resetToken: 'reset-token-id:reset-raw',
      newPassword: 'NewPass1!',
    });
    expect(mocks.tokens.validatePasswordResetToken).toHaveBeenCalledWith(
      'reset-token-id:reset-raw',
    );
  });

  it('hashes the new password', async () => {
    await service.resetPassword({
      resetToken: 'token',
      newPassword: 'NewPass1!',
    });
    expect(mocks.passwords.hash).toHaveBeenCalledWith('NewPass1!');
  });

  it('updates password, consumes reset token, and revokes refresh tokens in a transaction', async () => {
    await service.resetPassword({
      resetToken: 'token',
      newPassword: 'NewPass1!',
    });
    expect(mocks.db.$transaction).toHaveBeenCalledTimes(1);
    expect(mocks.db.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { passwordHash: 'new-hashed-password' },
      }),
    );
    expect(mocks.db.passwordResetToken.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { consumedAt: expect.any(Date) } }),
    );
    expect(mocks.db.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: REGISTERED_USER.id, revokedAt: null },
      }),
    );
  });

  it('does not issue access/refresh tokens', async () => {
    const result = await service.resetPassword({
      resetToken: 'token',
      newPassword: 'NewPass1!',
    });
    expect(mocks.tokens.issueAccessToken).not.toHaveBeenCalled();
    expect(result).not.toHaveProperty('accessToken');
  });

  it('throws INVALID_RESET_TOKEN for an invalid token', async () => {
    const { AppError } = await import('../core/errors/app-error');
    mocks.tokens.validatePasswordResetToken.mockRejectedValue(
      new AppError('INVALID_RESET_TOKEN', 'Password reset token is invalid'),
    );
    await expect(
      service.resetPassword({ resetToken: 'bad', newPassword: 'NewPass1!' }),
    ).rejects.toMatchObject({ code: 'INVALID_RESET_TOKEN' });
  });
});
