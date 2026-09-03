import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FtaarApi } from '../api/ftaar-api';
import type { AuthSession, AuthUser } from '../api/types';

const REFRESH_KEY = 'ftaar.refreshToken';
const PENDING_EMAIL_KEY = 'ftaar.pendingEmail';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly api = inject(FtaarApi);
  private readonly router = inject(Router);
  private refreshInFlight: Promise<string | null> | null = null;

  readonly status = signal<'bootstrapping' | 'anonymous' | 'ready'>(
    'bootstrapping',
  );
  readonly user = signal<AuthUser | null>(null);
  readonly accessToken = signal<string | null>(null);
  readonly pendingEmail = signal<string | null>(
    localStorage.getItem(PENDING_EMAIL_KEY),
  );

  get refreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  }

  readonly isRegistered = computed(() => this.user()?.kind === 'registered');

  async bootstrap(): Promise<void> {
    const refresh = this.refreshToken;
    if (!refresh) {
      this.status.set('anonymous');
      return;
    }
    try {
      const session = await this.api.refresh(refresh);
      this.applySession(session);
      this.status.set('ready');
    } catch {
      localStorage.removeItem(REFRESH_KEY);
      this.accessToken.set(null);
      this.user.set(null);
      this.status.set('anonymous');
    }
  }

  applySession(session: AuthSession): void {
    this.accessToken.set(session.accessToken);
    this.user.set(session.user);
    localStorage.setItem(REFRESH_KEY, session.refreshToken);
    this.status.set('ready');
  }

  setPendingEmail(email: string | null): void {
    this.pendingEmail.set(email);
    if (email) {
      localStorage.setItem(PENDING_EMAIL_KEY, email);
    } else {
      localStorage.removeItem(PENDING_EMAIL_KEY);
    }
  }

  async refreshAccessToken(): Promise<string | null> {
    if (this.refreshInFlight) {
      return this.refreshInFlight;
    }
    const refresh = this.refreshToken;
    if (!refresh) {
      return null;
    }
    this.refreshInFlight = this.api
      .refresh(refresh)
      .then((session) => {
        this.applySession(session);
        return session.accessToken;
      })
      .catch(() => null)
      .finally(() => {
        this.refreshInFlight = null;
      });
    return this.refreshInFlight;
  }

  expire(): void {
    localStorage.removeItem(REFRESH_KEY);
    this.accessToken.set(null);
    this.user.set(null);
    this.status.set('anonymous');
    void this.router.navigateByUrl('/welcome');
  }

  async logout(): Promise<void> {
    const refresh = this.refreshToken;
    if (refresh) {
      try {
        await this.api.logout(refresh);
      } catch {
        // always drop local session
      }
    }
    this.expire();
  }
}
