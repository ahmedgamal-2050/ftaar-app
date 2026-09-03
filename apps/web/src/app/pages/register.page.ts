import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FtaarApi } from '../core/api/ftaar-api';
import { getApiError } from '../core/api/http-error';
import { SessionService } from '../core/session/session.service';
import { Banner, Field } from '../ui/ui';

@Component({
  selector: 'fta-register-page',
  imports: [FormsModule, RouterLink, Banner, Field],
  template: `
    <h2 class="mb-5 text-2xl font-semibold text-dc-header">
      Create an account
    </h2>
    <fta-banner [message]="error()" />
    <form class="mt-4 flex flex-col gap-5" (ngSubmit)="submit()">
      <fta-field label="Email">
        <input
          class="h-10 w-full rounded-[3px] bg-dc-input px-2.5 text-sm text-dc-header outline-none"
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          [(ngModel)]="email"
        />
      </fta-field>
      <fta-field label="Password">
        <input
          class="h-10 w-full rounded-[3px] bg-dc-input px-2.5 text-sm text-dc-header outline-none"
          name="password"
          type="password"
          required
          minlength="8"
          placeholder="At least 8 characters"
          [(ngModel)]="password"
        />
      </fta-field>
      <button
        class="h-11 rounded-[3px] bg-blurple text-sm font-medium text-white hover:bg-blurple-hover disabled:opacity-50"
        [disabled]="busy()"
      >
        Continue
      </button>
      <p class="text-sm text-dc-muted">
        Already have an account?
        <a routerLink="/login" class="text-dc-link hover:underline">Log In</a>
      </p>
    </form>
  `,
})
export class RegisterPage {
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
      await this.api.register(this.email, this.password);
      this.session.setPendingEmail(this.email);
      await this.router.navigateByUrl('/verify-otp');
    } catch (err) {
      this.error.set(getApiError(err).message);
    } finally {
      this.busy.set(false);
    }
  }
}
