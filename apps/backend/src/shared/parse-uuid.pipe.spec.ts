import { ParseUuidPipe } from './parse-uuid.pipe';
import { AppError } from '../core/errors/app-error';

describe('ParseUuidPipe', () => {
  const pipe = new ParseUuidPipe();

  it('accepts a UUID v4', () => {
    expect(pipe.transform('550e8400-e29b-41d4-a716-446655440000')).toBe(
      '550e8400-e29b-41d4-a716-446655440000',
    );
  });

  it('rejects a non-UUID', () => {
    expect(() => pipe.transform('not-a-uuid')).toThrow(AppError);
    expect(() => pipe.transform(1)).toThrow(AppError);
  });
});
