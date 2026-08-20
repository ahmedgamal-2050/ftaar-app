import { ConfigValidationError, parseEnv } from './env.schema';

describe('parseEnv', () => {
  it('accepts a valid environment', () => {
    expect(
      parseEnv({
        NODE_ENV: 'test',
        PORT: '3000',
        LOG_LEVEL: 'silent',
        DATABASE_URL: 'postgres://ftaar:ftaar@127.0.0.1:5432/ftaar',
        JWT_SECRET: 'test-jwt-secret-16',
        CORS_ORIGINS: 'http://localhost:3000',
      }),
    ).toEqual({
      NODE_ENV: 'test',
      PORT: 3000,
      LOG_LEVEL: 'silent',
      DATABASE_URL: 'postgres://ftaar:ftaar@127.0.0.1:5432/ftaar',
      JWT_SECRET: 'test-jwt-secret-16',
      CORS_ORIGINS: 'http://localhost:3000',
      BODY_LIMIT: '256kb',
    });
  });

  it('names missing variables', () => {
    expect(() => parseEnv({})).toThrow(ConfigValidationError);
    try {
      parseEnv({});
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigValidationError);
      expect((err as ConfigValidationError).message).toMatch(
        /NODE_ENV.*PORT|PORT.*NODE_ENV/,
      );
      expect((err as ConfigValidationError).names).toEqual(
        expect.arrayContaining([
          'NODE_ENV',
          'PORT',
          'DATABASE_URL',
          'JWT_SECRET',
        ]),
      );
    }
  });
});
