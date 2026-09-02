import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FtaarApi } from '../core/api/ftaar-api';
import { getApiError } from '../core/api/http-error';
import { SessionService } from '../core/session/session.service';
import { Banner, Field, OkBanner } from '../ui/ui';

@Component({
  selector: 'fta-forgot-page',
  imports: [FormsModule, Banner, Field, OkBanner],
  template: `
    <h2 class="mb-5 text-2xl font-semibold text-dc-header">Forgot password</h2>
    <fta-banner [message]="error()" />
    <fta-ok [message]="info()" />
    @if (step() === 'email') {
      <form class="mt-4 flex flex-col gap-5" (ngSubmit)="send()">
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
        <button
          class="h-11 rounded-[3px] bg-blurple text-sm font-medium text-white hover:bg-blurple-hover disabled:opacity-50"
          [disabled]="busy()"
        >
          Send OTP
        </button>
      </form>
    } @else {
      <form class="mt-4 flex flex-col gap-5" (ngSubmit)="verify()">
        <fta-field label="OTP">
          <input
            class="h-10 w-full rounded-[3px] bg-dc-input px-2.5 text-sm text-dc-header outline-none"
            name="otp"
            required
            maxlength="6"
            placeholder="6-digit code"
            [(ngModel)]="otp"
          />
        </fta-field>
        <button
          class="h-11 rounded-[3px] bg-blurple text-sm font-medium text-white hover:bg-blurple-hover disabled:opacity-50"
          [disabled]="busy()"
        >
          Verify OTP
        </button>
      </form>
    }
  `,
})
export class ForgotPage {
  private readonly api = inject(FtaarApi);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  email = '';
  otp = '';
  readonly step = signal<'email' | 'otp'>('email');
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly info = signal<string | null>(null);

  async send(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      const res = await this.api.forgotPassword(this.email);
      this.info.set(res.message);
      this.session.setPendingEmail(this.email);
      this.step.set('otp');
    } catch (err) {
      this.error.set(getApiError(err).message);
    } finally {
      this.busy.set(false);
    }
  }

  async verify(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      const res = await this.api.verifyForgotPasswordOtp(this.email, this.otp);
      await this.router.navigate(['/reset'], {
        queryParams: { token: res.resetToken },
      });
    } catch (err) {
      this.error.set(getApiError(err).message);
    } finally {
      this.busy.set(false);
    }
  }
}
