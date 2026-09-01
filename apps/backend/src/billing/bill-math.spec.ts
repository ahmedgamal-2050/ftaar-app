import { Money } from '../money/money';
import { buildInvariant } from './bill-math';
import type { BillLineInput, BillMemberInput } from './bill-math';

const fees = {
  deliveryFee: Money.fromPiastres(100n),
  serviceFee: Money.fromPiastres(50n),
  discount: Money.zero(),
  receiptTotal: Money.fromPiastres(999n),
};

function members(): BillMemberInput[] {
  return [
    {
      id: 'm-owner',
      userId: 'u-owner',
      displayName: 'Owner',
      role: 'admin',
      paymentStatus: 'unpaid',
    },
    {
      id: 'm-other',
      userId: 'u-other',
      displayName: 'Other',
      role: 'member',
      paymentStatus: 'unpaid',
    },
  ];
}

function lines(ownerDelivered: boolean): BillLineInput[] {
  return [
    {
      id: 'l1',
      memberId: 'm-owner',
      menuItemId: 'menu-a',
      name: 'كشري',
      qty: 1,
      referencePrice: Money.fromPiastres(200n),
      actualPrice: Money.fromPiastres(200n),
      delivered: ownerDelivered,
    },
    {
      id: 'l2',
      memberId: 'm-other',
      menuItemId: 'menu-b',
      name: 'شاي',
      qty: 1,
      referencePrice: Money.fromPiastres(200n),
      actualPrice: Money.fromPiastres(200n),
      delivered: true,
    },
  ];
}

describe('bill math', () => {
  it('warns on receipt mismatch without blocking (BILL-10)', () => {
    const preview = buildInvariant(members(), lines(true), fees);
    expect(preview.reconciliation.warns).toBe(true);
    expect(preview.reconciliation.difference?.toPiastres()).not.toBe(0n);
  });

  it('marks a member with no delivered items as paid (BILL-12)', () => {
    const preview = buildInvariant(members(), lines(false), fees);
    expect(
      preview.members.find((row) => row.id === 'm-owner')?.paymentStatus,
    ).toBe('paid');
  });

  it('drops an undelivered line from the owner and raises the other share (BILL-16)', () => {
    const allDelivered = buildInvariant(members(), lines(true), fees);
    const ownerUndelivered = buildInvariant(members(), lines(false), fees);
    const ownerAll = allDelivered.members.find((row) => row.id === 'm-owner');
    const ownerDrop = ownerUndelivered.members.find(
      (row) => row.id === 'm-owner',
    );
    const otherAll = allDelivered.members.find((row) => row.id === 'm-other');
    const otherDrop = ownerUndelivered.members.find(
      (row) => row.id === 'm-other',
    );
    expect(ownerAll && ownerDrop && otherAll && otherDrop).toBeTruthy();
    if (!ownerAll || !ownerDrop || !otherAll || !otherDrop) {
      return;
    }
    expect(
      ownerAll.itemsSubtotal.sub(ownerDrop.itemsSubtotal).toPiastres(),
    ).toBe(200n);
    expect(ownerDrop.total.toPiastres()).toBe(
      ownerAll.total.toPiastres() -
        200n -
        (ownerAll.feesShare.toPiastres() - ownerDrop.feesShare.toPiastres()),
    );
    expect(otherDrop.feesShare.toPiastres()).toBeGreaterThan(
      otherAll.feesShare.toPiastres(),
    );
    const sumDrop = ownerUndelivered.members.reduce(
      (acc, row) => acc + row.total.toPiastres(),
      0n,
    );
    expect(sumDrop).toBe(ownerUndelivered.total.toPiastres());
  });
});
