import {
  ApplicationConfig,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  inject,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { appRoutes } from './app.routes';
import { authInterceptor } from './core/api/auth.interceptor';
import { envelopeInterceptor } from './core/api/envelope.interceptor';
import { SessionService } from './core/session/session.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor, envelopeInterceptor])),
    provideAppInitializer(() => inject(SessionService).bootstrap()),
  ],
};
