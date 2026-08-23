import { Money } from './money';
import { serializeMoney } from './serialize-money';

describe('serializeMoney', () => {
  it('converts Money and bigint in nested structures', () => {
    expect(
      serializeMoney({
        price: Money.fromPiastres(3687n),
        raw: 100n,
        when: new Date('2020-01-01T00:00:00.000Z'),
        items: [Money.zero()],
      }),
    ).toEqual({
      price: '36.87',
      raw: '1.00',
      when: new Date('2020-01-01T00:00:00.000Z'),
      items: ['0.00'],
    });
  });

  it('returns primitives unchanged', () => {
    expect(serializeMoney(null)).toBeNull();
    expect(serializeMoney('ok')).toBe('ok');
  });
});
