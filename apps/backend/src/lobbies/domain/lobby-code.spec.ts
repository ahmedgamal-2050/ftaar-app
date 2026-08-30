import { AppError } from '../../core/errors/app-error';
import { generateLobbyCode, normalizeLobbyCode } from './lobby-code';

describe('lobby code', () => {
  it('generates a 6-character uppercase alphanumeric code', () => {
    expect(generateLobbyCode()).toMatch(/^[A-Z0-9]{6}$/);
  });

  it('normalizes casing and surrounding whitespace', () => {
    expect(normalizeLobbyCode(' b12f7k ')).toBe('B12F7K');
  });

  it('rejects codes that are not 6 alphanumeric characters', () => {
    expect(() => normalizeLobbyCode('B12-7K')).toThrow(AppError);
    expect(() => normalizeLobbyCode('B12F7')).toThrow(AppError);
  });
});
