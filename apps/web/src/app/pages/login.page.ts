import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FtaarApi } from '../core/api/ftaar-api';
import { getApiError } from '../core/api/http-error';
import { SessionService } from '../core/session/session.service';
import { Banner, Field } from '../ui/ui';

@Component({
  selector: 'fta-login-page',
  imports: [FormsModule, RouterLink, Banner, Field],
  template: `
    <h2 class="mb-1 text-2xl font-semibold text-dc-header">Welcome back!</h2>
    <p class="mb-5 text-sm text-dc-muted">We're so excited to see you again!</p>
    <fta-banner [message]="error()" />
    <form class="mt-4 flex flex-col gap-4" (ngSubmit)="submit()">
      <fta-field label="Email">
        <input
          class="h-10 w-full rounded-[3px] bg-dc-input px-2.5 text-sm text-dc-header outline-none"
          name="email"
          type="email"
          required
          [(ngModel)]="email"
        />
      </fta-field>
      <fta-field label="Password">
        <input
          class="h-10 w-full rounded-[3px] bg-dc-input px-2.5 text-sm text-dc-header outline-none"
          name="password"
          type="password"
          required
          [(ngModel)]="password"
        />
      </fta-field>
      <a routerLink="/forgot" class="text-sm text-dc-link hover:underline"
        >Forgot your password?</a
      >
      <button
        class="h-11 rounded-[3px] bg-blurple text-sm font-medium text-white hover:bg-blurple-hover disabled:opacity-50"
        [disabled]="busy()"
      >
        Log In
      </button>
      <p class="text-sm text-dc-muted">
        Need an account?
        <a routerLink="/register" class="text-dc-link hover:underline"
          >Register</a
        >
      </p>
    </form>
  `,
})
export class LoginPage {
  private readonly api = inject(FtaarApi);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  email = '';
  password = '';
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  async submit(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      const session = await this.api.login(this.email, this.password);
      this.session.applySession(session);
      await this.router.navigateByUrl('/home');
    } catch (err) {
      this.error.set(getApiError(err).message);
    } finally {
      this.busy.set(false);
    }
  }
}
