import { of } from 'rxjs';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { Money } from '../../money/money';
import { ResponseWrapInterceptor } from './response-wrap.interceptor';

function contextWithStatus(statusCode: number): ExecutionContext {
  return {
    switchToHttp: () => ({
      getResponse: () => ({ statusCode }),
    }),
  } as ExecutionContext;
}

describe('ResponseWrapInterceptor', () => {
  const interceptor = new ResponseWrapInterceptor();

  it('wraps plain payloads', (done) => {
    const next: CallHandler = { handle: () => of({ message: 'Hello API' }) };
    interceptor.intercept(contextWithStatus(200), next).subscribe((body) => {
      expect(body).toEqual({
        success: true,
        data: { message: 'Hello API' },
      });
      done();
    });
  });

  it('does not double-wrap', (done) => {
    const already = { success: true, data: { ok: true } };
    const next: CallHandler = { handle: () => of(already) };
    interceptor.intercept(contextWithStatus(200), next).subscribe((body) => {
      expect(body).toEqual(already);
      done();
    });
  });

  it('serialises Money in the envelope', (done) => {
    const next: CallHandler = {
      handle: () => of({ total: Money.fromPiastres(3687n) }),
    };
    interceptor.intercept(contextWithStatus(200), next).subscribe((body) => {
      expect(body).toEqual({
        success: true,
        data: { total: '36.87' },
      });
      done();
    });
  });

  it('leaves 204 bodies untouched', (done) => {
    const next: CallHandler = { handle: () => of(undefined) };
    interceptor.intercept(contextWithStatus(204), next).subscribe((body) => {
      expect(body).toBeUndefined();
      done();
    });
  });
});
