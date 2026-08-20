import { ConfigValidationError, parseEnv } from './env.schema';

describe('parseEnv', () => {
  it('accepts a valid environment', () => {
    expect(
      parseEnv({ NODE_ENV: 'test', PORT: '3000', LOG_LEVEL: 'silent' }),
    ).toEqual({
      NODE_ENV: 'test',
      PORT: 3000,
      LOG_LEVEL: 'silent',
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
        expect.arrayContaining(['NODE_ENV', 'PORT']),
      );
    }
  });
});
