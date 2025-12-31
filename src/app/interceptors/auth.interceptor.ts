import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * HTTP Interceptor that adds JWT token to requests
 *
 * Automatically attaches the Authorization header with Bearer token
 * to all HTTP requests going to the API
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  // Get the auth header from AuthService
  const authHeader = authService.getAuthHeader();

  // Clone request and add authorization header if token exists
  if (authHeader) {
    req = req.clone({
      setHeaders: {
        Authorization: authHeader,
      },
    });
  }

  return next(req);
};
