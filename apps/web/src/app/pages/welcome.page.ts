import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FtaarApi } from '../core/api/ftaar-api';
import { getApiError } from '../core/api/http-error';
import { SessionService } from '../core/session/session.service';
import { Banner } from '../ui/ui';

@Component({
  selector: 'fta-welcome-page',
  imports: [RouterLink, Banner],
  template: `
    <h2 class="mb-2 text-2xl font-semibold text-dc-header">Welcome back!</h2>
    <p class="mb-6 text-sm text-dc-muted">
      Sign in, register, or hop in as a guest to use the API.
    </p>
    <fta-banner [message]="error()" />
    <div class="mt-4 flex flex-col gap-3">
      <button
        type="button"
        class="h-11 rounded-[3px] bg-dc-green text-sm font-medium text-white hover:bg-dc-green-hover disabled:opacity-50"
        [disabled]="busy()"
        (click)="guest()"
      >
        Continue as Guest
      </button>
      <a
        routerLink="/login"
        class="flex h-11 items-center justify-center rounded-[3px] bg-blurple text-sm font-medium text-white hover:bg-blurple-hover"
        >Log In</a
      >
      <a
        routerLink="/register"
        class="flex h-11 items-center justify-center rounded-[3px] bg-dc-modifier text-sm font-medium text-white hover:bg-dc-hover"
        >Register</a
      >
    </div>
  `,
})
export class WelcomePage {
  private readonly api = inject(FtaarApi);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  async guest(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      const session = await this.api.guest();
      this.session.applySession(session);
      await this.router.navigateByUrl('/home');
    } catch (err) {
      this.error.set(getApiError(err).message);
    } finally {
      this.busy.set(false);
    }
  }
}
