import { Money } from '../money/money';
import { MenuItem, parseReferencePrice } from './menu-item.entity';

const NOW = new Date('2026-08-26T00:00:00.000Z');

describe('MenuItem entity (MENU-01)', () => {
  it('maps BIGINT referencePrice through Money', () => {
    const item = MenuItem.fromPersistence({
      id: '11111111-1111-4111-8111-111111111111',
      restaurantId: '22222222-2222-4222-8222-222222222222',
      name: 'شاي',
      category: 'مشروبات',
      referencePrice: 3687n,
      isActive: true,
      createdAt: NOW,
      updatedAt: NOW,
    });

    expect(item.referencePrice).toBeInstanceOf(Money);
    expect(item.referencePrice.toEgpString()).toBe('36.87');
    expect(item.toResponse().referencePrice.toJSON()).toBe('36.87');
  });

  it('rejects a negative referencePrice', () => {
    expect(() =>
      MenuItem.fromPersistence({
        id: '11111111-1111-4111-8111-111111111111',
        restaurantId: '22222222-2222-4222-8222-222222222222',
        name: 'شاي',
        category: '',
        referencePrice: -1n,
        isActive: true,
        createdAt: NOW,
        updatedAt: NOW,
      }),
    ).toThrow(/referencePrice must be >= 0/);
  });

  it('accepts zero', () => {
    const item = MenuItem.create({
      id: '11111111-1111-4111-8111-111111111111',
      restaurantId: '22222222-2222-4222-8222-222222222222',
      name: 'ماء',
      category: '',
      referencePrice: Money.zero(),
      isActive: true,
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(item.referencePrice.toPiastres()).toBe(0n);
  });

  it('parses EGP strings into Money', () => {
    expect(parseReferencePrice('10').toPiastres()).toBe(1000n);
  });
});
