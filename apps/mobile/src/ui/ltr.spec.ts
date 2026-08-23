import { isolateLtr } from './ltr';

describe('isolateLtr', () => {
  it('leaves values untouched in an LTR layout', () => {
    expect(isolateLtr('12.50 SAR', false)).toBe('12.50 SAR');
    expect(isolateLtr(42, false)).toBe('42');
  });

  it('brackets values in LTR isolates when the layout is RTL', () => {
    expect(isolateLtr('4F2K-9B', true)).toBe('\u20664F2K-9B\u2069');
  });
});
