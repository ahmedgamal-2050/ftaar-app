import { memberColor, memberInitials } from './memberColor';

describe('memberColor', () => {
  it('returns the same colour for the same name every time', () => {
    expect(memberColor('Mohamed Salah')).toBe(memberColor('Mohamed Salah'));
  });

  it('ignores surrounding whitespace and case', () => {
    expect(memberColor('  mohamed salah ')).toBe(memberColor('Mohamed Salah'));
  });

  it('separates different names', () => {
    expect(memberColor('Mohamed')).not.toBe(memberColor('Ahmed'));
  });

  it('produces a colour dark enough for white initials', () => {
    const match = /^hsl\((\d+), 42%, 42%\)$/.exec(memberColor('Layla'));
    expect(match).not.toBeNull();
    expect(Number(match?.[1])).toBeLessThan(360);
  });
});

describe('memberInitials', () => {
  it('takes the first and last word', () => {
    expect(memberInitials('Mohamed Salah')).toBe('MS');
  });

  it('handles a single word', () => {
    expect(memberInitials('Mohamed')).toBe('M');
  });

  it('skips the middle of a long name', () => {
    expect(memberInitials('Mohamed Ahmed Salah')).toBe('MS');
  });

  it('keeps Arabic names intact', () => {
    expect(memberInitials('محمد صلاح')).toBe('مص');
  });

  it('falls back to a placeholder for an empty name', () => {
    expect(memberInitials('   ')).toBe('?');
  });
});
