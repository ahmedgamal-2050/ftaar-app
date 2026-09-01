import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FtaarApi } from '../core/api/ftaar-api';
import { getApiError } from '../core/api/http-error';
import { SessionService } from '../core/session/session.service';
import { Banner, Field, OkBanner } from '../ui/ui';

@Component({
  selector: 'fta-verify-otp-page',
  imports: [FormsModule, Banner, Field, OkBanner],
  template: `
    <h2 class="mb-1 text-2xl font-semibold text-dc-header">Check your email</h2>
    <p class="mb-5 text-sm text-dc-muted">
      Enter the 6-digit code sent to {{ email }}.
    </p>
    <fta-banner [message]="error()" />
    <fta-ok [message]="info()" />
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
      <fta-field label="OTP">
        <input
          class="h-10 w-full rounded-[3px] bg-dc-input px-2.5 text-sm tracking-[0.4em] text-dc-header outline-none"
          name="otp"
          required
          maxlength="6"
          pattern="\\d{6}"
          [(ngModel)]="otp"
        />
      </fta-field>
      <button
        class="h-11 rounded-[3px] bg-blurple text-sm font-medium text-white hover:bg-blurple-hover disabled:opacity-50"
        [disabled]="busy()"
      >
        Verify
      </button>
      <button
        type="button"
        class="text-sm text-dc-link hover:underline"
        [disabled]="busy()"
        (click)="resend()"
      >
        Resend code
      </button>
    </form>
  `,
})
export class VerifyOtpPage {
  private readonly api = inject(FtaarApi);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  email = this.session.pendingEmail() ?? '';
  otp = '';
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly info = signal<string | null>(null);

  async submit(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      const session = await this.api.verifyRegistrationOtp(
        this.email,
        this.otp,
      );
      this.session.setPendingEmail(null);
      this.session.applySession(session);
      await this.router.navigateByUrl('/home');
    } catch (err) {
      this.error.set(getApiError(err).message);
    } finally {
      this.busy.set(false);
    }
  }

  async resend(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      const res = await this.api.resendRegistrationOtp(this.email);
      this.info.set(res.message);
    } catch (err) {
      this.error.set(getApiError(err).message);
    } finally {
      this.busy.set(false);
    }
  }
}
