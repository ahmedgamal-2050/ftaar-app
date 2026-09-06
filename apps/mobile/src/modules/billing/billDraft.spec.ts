import type { BillDraft } from '../../api/endpoints/billing';
import {
  allPatches,
  groupPatch,
  initialEdits,
  perItemDeltaPiastres,
  referencePiastres,
  subtotalPiastres,
  unpricedItemNames,
} from './billDraft';

const FOUL = 'menu-foul';
const TEA = 'menu-tea';

/** Foul: two people, 4 + 2, already priced. Tea: one person, 1, unpriced. */
function draft(): BillDraft {
  return {
    lobbyId: 'lobby-1',
    status: 'locked',
    members: [
      {
        id: 'member-a',
        userId: 'user-a',
        displayName: 'Ahmed',
        role: 'admin',
        paymentStatus: 'unpaid',
      },
      {
        id: 'member-b',
        userId: 'user-b',
        displayName: 'Sarah',
        role: 'member',
        paymentStatus: 'unpaid',
      },
    ],
    groups: [
      {
        menuItemId: FOUL,
        name: 'Foul',
        referencePrice: '10.00',
        lines: [
          {
            id: 'line-a',
            memberId: 'member-a',
            qty: 4,
            actualPrice: '40.00',
            delivered: true,
            suggestedActual: '40.00',
          },
          {
            id: 'line-b',
            memberId: 'member-b',
            qty: 2,
            actualPrice: '20.00',
            delivered: true,
            suggestedActual: '20.00',
          },
        ],
      },
      {
        menuItemId: TEA,
        name: 'Tea',
        referencePrice: '5.00',
        lines: [
          {
            id: 'line-c',
            memberId: 'member-a',
            qty: 1,
            actualPrice: null,
            delivered: true,
            suggestedActual: '5.00',
          },
        ],
      },
    ],
  };
}

describe('initialEdits', () => {
  it('shows an item priced across several people as one total', () => {
    const edits = initialEdits(draft());

    expect(edits[FOUL].price).toBe('60.00');
    expect(edits[FOUL].delivered).toEqual({ 'line-a': true, 'line-b': true });
  });

  it('leaves an unpriced item blank rather than pre-filling the menu price', () => {
    expect(initialEdits(draft())[TEA].price).toBe('');
  });
});

describe('groupPatch', () => {
  it('splits the typed total back across the lines by quantity', () => {
    const model = draft();
    const edits = initialEdits(model);
    edits[FOUL].price = '66.00';

    expect(groupPatch(model.groups[0], edits[FOUL])).toEqual([
      { id: 'line-a', actualPrice: '44.00', delivered: true },
      { id: 'line-b', actualPrice: '22.00', delivered: true },
    ]);
  });

  it('drops an undelivered line and re-splits over the rest', () => {
    const model = draft();
    const edits = initialEdits(model);
    edits[FOUL].price = '40.00';
    edits[FOUL].delivered['line-b'] = false;

    expect(groupPatch(model.groups[0], edits[FOUL])).toEqual([
      { id: 'line-b', actualPrice: null, delivered: false },
      { id: 'line-a', actualPrice: '40.00', delivered: true },
    ]);
  });

  it('clears a price the host blanked out instead of leaving the old one', () => {
    const model = draft();
    const edits = initialEdits(model);
    edits[FOUL].price = '';

    expect(groupPatch(model.groups[0], edits[FOUL])).toEqual([
      { id: 'line-a', actualPrice: null, delivered: true },
      { id: 'line-b', actualPrice: null, delivered: true },
    ]);
  });
});

describe('totals', () => {
  it('adds the entered prices up, ignoring what is still blank', () => {
    const model = draft();
    expect(subtotalPiastres(model, initialEdits(model))).toBe(6000);
  });

  it('prices the same items at the menu rate for comparison', () => {
    const model = draft();
    // 6 Foul at 10.00 plus 1 Tea at 5.00.
    expect(referencePiastres(model, initialEdits(model))).toBe(6500);
  });

  it('excludes an undelivered line from the menu-rate comparison', () => {
    const model = draft();
    const edits = initialEdits(model);
    edits[FOUL].delivered['line-b'] = false;

    expect(referencePiastres(model, edits)).toBe(4500);
  });
});

describe('perItemDeltaPiastres', () => {
  it('is silent when the charge matches the menu', () => {
    const model = draft();
    expect(
      perItemDeltaPiastres(model.groups[0], initialEdits(model)[FOUL]),
    ).toBe(null);
  });

  it('reports the surcharge per unit, not the whole overage', () => {
    const model = draft();
    const edits = initialEdits(model);
    edits[FOUL].price = '69.00';

    // 9.00 over 6 items.
    expect(perItemDeltaPiastres(model.groups[0], edits[FOUL])).toBe(150);
  });

  it('goes negative when the restaurant charged less', () => {
    const model = draft();
    const edits = initialEdits(model);
    edits[FOUL].price = '54.00';

    expect(perItemDeltaPiastres(model.groups[0], edits[FOUL])).toBe(-100);
  });
});

describe('unpricedItemNames', () => {
  it('names what finalise would reject', () => {
    const model = draft();
    expect(unpricedItemNames(model, initialEdits(model))).toEqual(['Tea']);
  });

  it('stops asking once the item is marked undelivered', () => {
    const model = draft();
    const edits = initialEdits(model);
    edits[TEA].delivered['line-c'] = false;

    expect(unpricedItemNames(model, edits)).toEqual([]);
  });
});

describe('allPatches', () => {
  it('covers every line in the draft', () => {
    const model = draft();
    expect(allPatches(model, initialEdits(model)).map((p) => p.id)).toEqual([
      'line-a',
      'line-b',
      'line-c',
    ]);
  });
});
