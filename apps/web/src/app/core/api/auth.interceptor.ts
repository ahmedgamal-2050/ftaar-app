import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { SessionService } from '../session/session.service';
import {
  PUBLIC_AUTH_PATHS,
  isSessionInvalidatingAuthError,
  requestPath,
} from './http-error';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(SessionService);
  const path = requestPath(req.url);
  const isPublic = PUBLIC_AUTH_PATHS.has(path);

  let headers = req.headers;
  const token = session.accessToken();
  if (token && !isPublic) {
    headers = headers.set('Authorization', `Bearer ${token}`);
  }
  const authReq = req.clone({ headers });

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401) {
        return throwError(() => error);
      }

      // Expired/invalid refresh token — clear local session, do not recurse.
      if (
        path === '/api/auth/refresh' &&
        isSessionInvalidatingAuthError(error)
      ) {
        session.clearLocalSession();
        return throwError(() => error);
      }

      if (isPublic || authReq.headers.has('X-Retry')) {
        return throwError(() => error);
      }

      return from(session.refreshAccessToken()).pipe(
        switchMap((nextToken) => {
          if (!nextToken) {
            // Only bounce to welcome when refresh credentials were cleared
            // (expired/revoked). Keep the user signed in on transient failures.
            if (!session.refreshToken) {
              session.expire();
            }
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
