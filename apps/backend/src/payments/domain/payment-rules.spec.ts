import { AppError } from '../../core/errors/app-error';
import {
  assertBoardVisible,
  assertCollecting,
  effectivePaymentStatus,
  memberOwes,
} from './payment-rules';

describe('payment-rules', () => {
  it('allows the board on billed and settled only', () => {
    expect(() => assertBoardVisible('billed')).not.toThrow();
    expect(() => assertBoardVisible('settled')).not.toThrow();
    try {
      assertBoardVisible('locked');
      throw new Error('expected NOT_IN_PAYMENT');
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect(error).toMatchObject({ code: 'NOT_IN_PAYMENT' });
    }
  });

  it('blocks mutations after settle', () => {
    try {
      assertCollecting('settled');
      throw new Error('expected LOBBY_SETTLED');
    } catch (error) {
      expect(error).toMatchObject({ code: 'LOBBY_SETTLED' });
    }
    expect(() => assertCollecting('billed')).not.toThrow();
  });

  it('treats the host and zero-balance members as paid', () => {
    expect(effectivePaymentStatus('admin', 'unpaid', 11050n)).toBe('paid');
    expect(effectivePaymentStatus('member', 'unpaid', 0n)).toBe('paid');
    expect(effectivePaymentStatus('member', 'pending', 11050n)).toBe('pending');
  });

  it('only waits on owing non-admin members', () => {
    expect(memberOwes('admin', 11050n)).toBe(false);
    expect(memberOwes('member', 0n)).toBe(false);
    expect(memberOwes('member', 11050n)).toBe(true);
  });
});
