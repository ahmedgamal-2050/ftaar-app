import { OtpService, OtpPurpose } from './services/otp.service';
import { AppConfigService } from '../core/config/app-config.service';
import { PrismaService } from '../database/prisma.service';
import { Test } from '@nestjs/testing';

const SECRET = 'test-email-otp-secret-must-be-at-least-32chars!!';
const MOCK_OTP_ID = 'otp-uuid-1234';

function buildOtpMocks() {
  const db = {
    otpVerification: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  } as unknown as PrismaService;

  const config = {
    emailOtpSecret: SECRET,
  } as unknown as AppConfigService;

  return { db, config };
}

async function buildOtpService(
  mocks: ReturnType<typeof buildOtpMocks>,
): Promise<OtpService> {
  const module = await Test.createTestingModule({
    providers: [
      OtpService,
      { provide: PrismaService, useValue: mocks.db },
      { provide: AppConfigService, useValue: mocks.config },
    ],
  }).compile();
  return module.get(OtpService);
}

// ---------------------------------------------------------------------------
// OtpService.generate
// ---------------------------------------------------------------------------

describe('OtpService.generate', () => {
  it('generates a 6-digit OTP and stores its hash (never the raw value)', async () => {
    const { db, config } = buildOtpMocks();
    db.otpVerification.create.mockResolvedValue({ id: MOCK_OTP_ID } as never);
    const service = await buildOtpService({ db, config });

    const raw = await service.generate(
      'user-id',
      OtpPurpose.EMAIL_VERIFICATION,
      10,
    );

    expect(raw).toMatch(/^\d{6}$/);

    const createArg = db.otpVerification.create.mock.calls[0]?.[0] as {
      data: { otpHash: string; userId: string; purpose: string };
    };
    // otpHash must NOT equal the raw OTP
    expect(createArg.data.otpHash).not.toBe(raw);
    // otpHash should be a hex string (HMAC-SHA256 output = 64 hex chars)
    expect(createArg.data.otpHash).toMatch(/^[0-9a-f]{64}$/);
    expect(createArg.data.userId).toBe('user-id');
    expect(createArg.data.purpose).toBe(OtpPurpose.EMAIL_VERIFICATION);
  });

  it('uses EMAIL_VERIFICATION purpose for registration OTPs', async () => {
    const mocks = buildOtpMocks();
    mocks.db.otpVerification.create.mockResolvedValue({
      id: MOCK_OTP_ID,
    } as never);
    const service = await buildOtpService(mocks);
    await service.generate('u', OtpPurpose.EMAIL_VERIFICATION, 10);
    const call = mocks.db.otpVerification.create.mock.calls[0]?.[0] as {
      data: { purpose: string };
    };
    expect(call?.data.purpose).toBe(OtpPurpose.EMAIL_VERIFICATION);
  });

  it('uses PASSWORD_RESET purpose for password reset OTPs', async () => {
    const mocks = buildOtpMocks();
    mocks.db.otpVerification.create.mockResolvedValue({
      id: MOCK_OTP_ID,
    } as never);
    const service = await buildOtpService(mocks);
    await service.generate('u', OtpPurpose.PASSWORD_RESET, 10);
    const call = mocks.db.otpVerification.create.mock.calls[0]?.[0] as {
      data: { purpose: string };
    };
    expect(call?.data.purpose).toBe(OtpPurpose.PASSWORD_RESET);
    expect(call?.data.purpose).not.toBe(OtpPurpose.EMAIL_VERIFICATION);
  });
});

// ---------------------------------------------------------------------------
// OtpService.validate
// ---------------------------------------------------------------------------

describe('OtpService.validate', () => {
  const future = new Date(Date.now() + 600_000);
  const past = new Date(Date.now() - 1_000);

  async function buildWithRecord(record: object | null) {
    const mocks = buildOtpMocks();
    mocks.db.otpVerification.findFirst.mockResolvedValue(record as never);
    if (record) {
      mocks.db.otpVerification.update.mockResolvedValue({
        ...record,
        attempts: (record as { attempts: number }).attempts + 1,
      } as never);
    }
    return { service: await buildOtpService(mocks), mocks };
  }

  it('returns otpId when the OTP is correct', async () => {
    // Generate the correct hash using the same mechanism
    const { createHmac } = await import('node:crypto');
    const correctHash = createHmac('sha256', SECRET)
      .update('123456')
      .digest('hex');

    const { service } = await buildWithRecord({
      id: MOCK_OTP_ID,
      otpHash: correctHash,
      expiresAt: future,
      attempts: 0,
    });

    const id = await service.validate(
      'u',
      OtpPurpose.EMAIL_VERIFICATION,
      '123456',
      5,
    );
    expect(id).toBe(MOCK_OTP_ID);
  });

  it('throws INVALID_OTP when no active OTP exists', async () => {
    const { service } = await buildWithRecord(null);
    await expect(
      service.validate('u', OtpPurpose.EMAIL_VERIFICATION, '123456', 5),
    ).rejects.toMatchObject({ code: 'INVALID_OTP' });
  });

  it('throws OTP_EXPIRED for an expired OTP', async () => {
    const { createHmac } = await import('node:crypto');
    const hash = createHmac('sha256', SECRET).update('123456').digest('hex');
    const { service } = await buildWithRecord({
      id: MOCK_OTP_ID,
      otpHash: hash,
      expiresAt: past,
      attempts: 0,
    });
    await expect(
      service.validate('u', OtpPurpose.EMAIL_VERIFICATION, '123456', 5),
    ).rejects.toMatchObject({ code: 'OTP_EXPIRED' });
  });

  it('throws INVALID_OTP for a wrong OTP', async () => {
    const { createHmac } = await import('node:crypto');
    const hash = createHmac('sha256', SECRET).update('999999').digest('hex');
    const { service, mocks } = await buildWithRecord({
      id: MOCK_OTP_ID,
      otpHash: hash,
      expiresAt: future,
      attempts: 0,
    });
    mocks.db.otpVerification.update.mockResolvedValue({
      id: MOCK_OTP_ID,
      attempts: 1,
    } as never);
    await expect(
      service.validate('u', OtpPurpose.EMAIL_VERIFICATION, '123456', 5),
    ).rejects.toMatchObject({ code: 'INVALID_OTP' });
  });

  it('throws OTP_TOO_MANY_ATTEMPTS when attempts >= maxAttempts', async () => {
    const { createHmac } = await import('node:crypto');
    const hash = createHmac('sha256', SECRET).update('999999').digest('hex');
    const { service } = await buildWithRecord({
      id: MOCK_OTP_ID,
      otpHash: hash,
      expiresAt: future,
      attempts: 5,
    });
    await expect(
      service.validate('u', OtpPurpose.EMAIL_VERIFICATION, '123456', 5),
    ).rejects.toMatchObject({ code: 'OTP_TOO_MANY_ATTEMPTS' });
  });

  it('EMAIL_VERIFICATION OTP is not accepted for PASSWORD_RESET (different purpose in query)', async () => {
    // The query filters by purpose — a record stored with EMAIL_VERIFICATION
    // will not be returned when querying for PASSWORD_RESET.
    const { service, mocks } = await buildWithRecord(null);
    // Simulate that no PASSWORD_RESET OTP exists
    mocks.db.otpVerification.findFirst.mockResolvedValue(null);
    await expect(
      service.validate('u', OtpPurpose.PASSWORD_RESET, '123456', 5),
    ).rejects.toMatchObject({ code: 'INVALID_OTP' });
    // Confirm the query used PASSWORD_RESET purpose
    const query = mocks.db.otpVerification.findFirst.mock.calls[0]?.[0] as {
      where: { purpose: string };
    };
    expect(query.where.purpose).toBe(OtpPurpose.PASSWORD_RESET);
  });
});

// ---------------------------------------------------------------------------
// OtpService.isWithinResendCooldown
// ---------------------------------------------------------------------------

describe('OtpService.isWithinResendCooldown', () => {
  it('returns true if a recent OTP exists', async () => {
    const mocks = buildOtpMocks();
    mocks.db.otpVerification.findFirst.mockResolvedValue({ id: 'x' } as never);
    const service = await buildOtpService(mocks);
    const result = await service.isWithinResendCooldown(
      'u',
      OtpPurpose.EMAIL_VERIFICATION,
      60,
    );
    expect(result).toBe(true);
  });

  it('returns false if no recent OTP exists', async () => {
    const mocks = buildOtpMocks();
    mocks.db.otpVerification.findFirst.mockResolvedValue(null);
    const service = await buildOtpService(mocks);
    const result = await service.isWithinResendCooldown(
      'u',
      OtpPurpose.EMAIL_VERIFICATION,
      60,
    );
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// OtpService.invalidateActive
// ---------------------------------------------------------------------------

describe('OtpService.invalidateActive', () => {
  it('marks all unconsumed OTPs as consumed', async () => {
    const mocks = buildOtpMocks();
    mocks.db.otpVerification.updateMany.mockResolvedValue({
      count: 2,
    } as never);
    const service = await buildOtpService(mocks);
    await service.invalidateActive('u', OtpPurpose.EMAIL_VERIFICATION);
    expect(mocks.db.otpVerification.updateMany).toHaveBeenCalledWith({
      where: {
        userId: 'u',
        purpose: OtpPurpose.EMAIL_VERIFICATION,
        consumedAt: null,
      },
      data: { consumedAt: expect.any(Date) },
    });
  });
});
