import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { map } from 'rxjs/operators';
import type { SuccessEnvelope } from './types';

export const envelopeInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    map((event) => {
      if (!(event instanceof HttpResponse)) {
        return event;
      }
      const body = event.body as SuccessEnvelope<unknown> | null;
      if (
        body &&
        typeof body === 'object' &&
        'success' in body &&
        body.success === true &&
        'data' in body
      ) {
        return event.clone({ body: body.data });
      }
      return event;
    }),
  );
