import type {
  BillDraft,
  BillDraftGroup,
  BillPatchLine,
} from '../../api/endpoints/billing';
import { fromPiastres, piastresOf, splitByQty, toPiastres } from './money';

/**
 * The Bill Entry screen's editable model. The server draft is grouped by menu
 * item but priced per line (one line per member who ordered it), so the host
 * types one price per *item* and this module distributes it back across that
 * item's delivered lines before the PATCH.
 */
export interface GroupEdit {
  /** Host-typed total charged for this item, across everyone who got it. */
  price: string;
  /** lineId → whether that member's portion actually arrived. */
  delivered: Record<string, boolean>;
}

/** Keyed by `menuItemId`. */
export type BillEdits = Record<string, GroupEdit>;

export function initialEdits(draft: BillDraft): BillEdits {
  const edits: BillEdits = {};
  for (const group of draft.groups) {
    const delivered: Record<string, boolean> = {};
    let priced = 0;
    let anyPrice = false;
    for (const line of group.lines) {
      delivered[line.id] = line.delivered;
      if (line.delivered && line.actualPrice !== null) {
        priced += toPiastres(line.actualPrice);
        anyPrice = true;
      }
    }
    edits[group.menuItemId] = {
      price: anyPrice ? fromPiastres(priced) : '',
      delivered,
    };
  }
  return edits;
}

function isDelivered(edit: GroupEdit | undefined, lineId: string): boolean {
  return edit?.delivered[lineId] ?? true;
}

export function deliveredQty(
  group: BillDraftGroup,
  edit: GroupEdit | undefined,
): number {
  return group.lines.reduce(
    (sum, line) => (isDelivered(edit, line.id) ? sum + line.qty : sum),
    0,
  );
}

/** What the menu said this many of the item should cost. */
export function referenceTotalPiastres(
  group: BillDraftGroup,
  edit: GroupEdit | undefined,
): number {
  return toPiastres(group.referencePrice) * deliveredQty(group, edit);
}

/**
 * How much more (or less, when negative) each unit came to than the menu
 * price. Null when nothing was delivered, or when no price is entered yet.
 */
export function perItemDeltaPiastres(
  group: BillDraftGroup,
  edit: GroupEdit | undefined,
): number | null {
  const qty = deliveredQty(group, edit);
  if (qty === 0 || !edit?.price) {
    return null;
  }
  const difference =
    piastresOf(edit.price) - referenceTotalPiastres(group, edit);
  if (difference === 0) {
    return null;
  }
  // Rounds toward zero so a 1-piastre rounding artefact never shows as a
  // whole-piastre-per-item surcharge.
  return Math.trunc(difference / qty);
}

/**
 * Turns one group's edit into per-line patches: the typed total split across
 * the delivered lines by quantity, and a null price on anything undelivered
 * so it drops out of the bill entirely.
 */
export function groupPatch(
  group: BillDraftGroup,
  edit: GroupEdit | undefined,
): BillPatchLine[] {
  const delivered = group.lines.filter((line) => isDelivered(edit, line.id));
  const undelivered = group.lines.filter((line) => !isDelivered(edit, line.id));

  const patches: BillPatchLine[] = undelivered.map((line) => ({
    id: line.id,
    actualPrice: null,
    delivered: false,
  }));

  if (!edit?.price) {
    // Still clear any stale price so a line the host blanked out doesn't keep
    // the value it had when the draft loaded.
    return patches.concat(
      delivered.map((line) => ({
        id: line.id,
        actualPrice: null,
        delivered: true,
      })),
    );
  }

  const shares = splitByQty(
    piastresOf(edit.price),
    delivered.map((line) => line.qty),
  );
  return patches.concat(
    delivered.map((line, index) => ({
      id: line.id,
      actualPrice: fromPiastres(shares[index]),
      delivered: true,
    })),
  );
}

export function allPatches(
  draft: BillDraft,
  edits: BillEdits,
): BillPatchLine[] {
  return draft.groups.flatMap((group) =>
    groupPatch(group, edits[group.menuItemId]),
  );
}

/** Sum of every entered price — the items half of the running total. */
export function subtotalPiastres(draft: BillDraft, edits: BillEdits): number {
  return draft.groups.reduce(
    (sum, group) => sum + piastresOf(edits[group.menuItemId]?.price),
    0,
  );
}

/** The same sum at menu prices, for the footer's "Ref:" comparison. */
export function referencePiastres(draft: BillDraft, edits: BillEdits): number {
  return draft.groups.reduce(
    (sum, group) =>
      sum + referenceTotalPiastres(group, edits[group.menuItemId]),
    0,
  );
}

/**
 * Items that arrived but have no price yet. Finalise rejects these with
 * `PRICES_INCOMPLETE`, so the screen names them before the host gets there.
 */
export function unpricedItemNames(
  draft: BillDraft,
  edits: BillEdits,
): string[] {
  return draft.groups
    .filter((group) => {
      const edit = edits[group.menuItemId];
      return deliveredQty(group, edit) > 0 && !edit?.price;
    })
    .map((group) => group.name);
}
