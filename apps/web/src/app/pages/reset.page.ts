import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FtaarApi } from '../core/api/ftaar-api';
import { getApiError } from '../core/api/http-error';
import { Banner, Field, OkBanner } from '../ui/ui';

@Component({
  selector: 'fta-reset-page',
  imports: [FormsModule, Banner, Field, OkBanner],
  template: `
    <h2 class="mb-5 text-2xl font-semibold text-dc-header">New password</h2>
    <fta-banner [message]="error()" />
    <fta-ok [message]="info()" />
    <form class="mt-4 flex flex-col gap-4" (ngSubmit)="submit()">
      <fta-field label="Reset token">
        <input
          class="h-10 w-full rounded-[3px] bg-dc-input px-2.5 text-sm text-dc-header outline-none"
          name="token"
          required
          [(ngModel)]="token"
        />
      </fta-field>
      <fta-field label="New password">
        <input
          class="h-10 w-full rounded-[3px] bg-dc-input px-2.5 text-sm text-dc-header outline-none"
          name="password"
          type="password"
          required
          minlength="8"
          [(ngModel)]="password"
        />
      </fta-field>
      <button
        class="h-11 rounded-[3px] bg-blurple text-sm font-medium text-white hover:bg-blurple-hover disabled:opacity-50"
        [disabled]="busy()"
      >
        Reset password
      </button>
    </form>
  `,
})
export class ResetPage {
  private readonly api = inject(FtaarApi);
  private readonly router = inject(Router);
  token = inject(ActivatedRoute).snapshot.queryParamMap.get('token') ?? '';
  password = '';
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly info = signal<string | null>(null);

  async submit(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      const res = await this.api.resetPassword(this.token, this.password);
      this.info.set(res.message);
      await this.router.navigateByUrl('/login');
    } catch (err) {
      this.error.set(getApiError(err).message);
    } finally {
      this.busy.set(false);
    }
  }
}
