import { colors, fontFamily, spacing, typography } from './theme';

describe('design tokens', () => {
  it('exposes the Ftaar palette', () => {
    expect(colors).toMatchObject({
      primary: '#D97742',
      background: '#FDF8F3',
      text: '#2B2320',
      textMuted: '#8A7A70',
      success: '#3E8E5A',
      warning: '#D9A544',
      danger: '#C24545',
      border: '#E8DDD3',
      surface: '#FFFFFF',
    });
  });

  it('uses a 4/8/12/16/24/32 spacing scale', () => {
    expect(Object.values(spacing)).toEqual([4, 8, 12, 16, 24, 32]);
  });

  it('renders every type scale step in Cairo', () => {
    const families = Object.values(fontFamily);
    for (const style of Object.values(typography)) {
      expect(families).toContain(style.fontFamily);
    }
  });

  it('never pairs a Cairo family with fontWeight, which Android double-bolds', () => {
    for (const style of Object.values(typography)) {
      expect(style.fontWeight).toBeUndefined();
    }
  });

  it('keeps money on tabular figures so amounts stay column-aligned', () => {
    expect(typography.money.fontVariant).toContain('tabular-nums');
  });
});
