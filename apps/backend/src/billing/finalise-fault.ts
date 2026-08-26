export type FinaliseFailPoint =
  | 'after-bill'
  | 'after-lines'
  | 'after-members'
  | 'after-status';

/** Test-only hook so BILL-15 can abort finalise mid-transaction. */
export class FinaliseFault {
  point: FinaliseFailPoint | null = null;

  trip(at: FinaliseFailPoint): void {
    if (this.point === at) {
      throw new Error(`injected finalise failure at ${at}`);
    }
  }
}
