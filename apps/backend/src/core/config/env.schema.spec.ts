import { ConfigValidationError, parseEnv } from './env.schema';

const BASE_VALID_ENV = {
  NODE_ENV: 'test',
  PORT: '3000',
  LOG_LEVEL: 'silent',
  DATABASE_URL: 'postgres://ftaar:ftaar@127.0.0.1:5432/ftaar',
  JWT_SECRET: 'test-jwt-secret-must-be-at-least-32-characters!!',
  EMAIL_OTP_SECRET: 'test-email-otp-secret-must-be-at-least-32chars!!',
};

describe('parseEnv', () => {
  it('accepts a valid environment', () => {
    const result = parseEnv(BASE_VALID_ENV);
    expect(result.NODE_ENV).toBe('test');
    expect(result.PORT).toBe(3000);
    expect(result.LOG_LEVEL).toBe('silent');
    expect(result.DATABASE_URL).toBe(
      'postgres://ftaar:ftaar@127.0.0.1:5432/ftaar',
    );
    expect(result.JWT_SECRET).toBe(
      'test-jwt-secret-must-be-at-least-32-characters!!',
    );
    expect(result.EMAIL_OTP_SECRET).toBe(
      'test-email-otp-secret-must-be-at-least-32chars!!',
    );
    // OTP defaults
    expect(result.EMAIL_VERIFICATION_OTP_TTL_MINUTES).toBe(10);
    expect(result.EMAIL_VERIFICATION_OTP_MAX_ATTEMPTS).toBe(5);
    expect(result.PASSWORD_RESET_TOKEN_TTL_MINUTES).toBe(10);
    // CORS/HTTP defaults
    expect(result.CORS_ORIGINS).toBe('http://localhost:3000');
    expect(result.BODY_LIMIT).toBe('256kb');
  });

  it('names missing variables', () => {
    expect(() => parseEnv({})).toThrow(ConfigValidationError);
    try {
      parseEnv({});
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigValidationError);
      expect((err as ConfigValidationError).names).toEqual(
        expect.arrayContaining([
          'NODE_ENV',
          'PORT',
          'DATABASE_URL',
          'JWT_SECRET',
          'EMAIL_OTP_SECRET',
        ]),
      );
    }
  });
});
