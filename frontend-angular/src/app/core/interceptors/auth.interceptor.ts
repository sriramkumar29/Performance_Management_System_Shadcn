import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, switchMap, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  // Allow opting out (e.g., token refresh/login requests)
  const skipAuth = req.headers.has('X-Skip-Auth');
  const alreadyRetried = req.headers.has('X-Auth-Retry');
  const baseReq = skipAuth ? req.clone({ headers: req.headers.delete('X-Skip-Auth') }) : req;

  const token = authService.getToken();
  const authReq = token && !skipAuth
    ? baseReq.clone({ headers: baseReq.headers.set('Authorization', `Bearer ${token}`) })
    : baseReq;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !skipAuth && !alreadyRetried) {
        const refreshToken = authService.getRefreshToken();
        if (!refreshToken) {
          // No refresh token available; forward error
          return throwError(() => err);
        }

        // Try refreshing the access token once, then retry original request
        return authService.refreshAccessToken().pipe(
          switchMap((newToken) => {
            const retryReq = req.clone({
              headers: req.headers
                .set('Authorization', `Bearer ${newToken}`)
                .set('X-Auth-Retry', 'true')
            });
            return next(retryReq);
          }),
          catchError((refreshErr) => {
            return throwError(() => refreshErr);
          })
        );
      }
      return throwError(() => err);
    })
  );
};
