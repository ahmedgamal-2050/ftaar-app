import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { SessionService } from '../session/session.service';
import { PUBLIC_AUTH_PATHS, requestPath } from './http-error';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(SessionService);
  const token = session.accessToken();
  let headers = req.headers;
  if (token) {
    headers = headers.set('Authorization', `Bearer ${token}`);
  }
  const userId = session.user()?.id;
  if (userId && requestPath(req.url).includes('/bill')) {
    headers = headers.set('x-user-id', userId);
  }
  const authReq = req.clone({ headers });

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      const path = requestPath(authReq.url);
      const isPublic = PUBLIC_AUTH_PATHS.has(path);
      if (error.status !== 401 || isPublic || authReq.headers.has('X-Retry')) {
        return throwError(() => error);
      }
      return from(session.refreshAccessToken()).pipe(
        switchMap((nextToken) => {
          if (!nextToken) {
            session.expire();
            return throwError(() => error);
          }
          return next(
            authReq.clone({
              setHeaders: {
                Authorization: `Bearer ${nextToken}`,
                'X-Retry': '1',
              },
            }),
          );
        }),
      );
    }),
  );
};
