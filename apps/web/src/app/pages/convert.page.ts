import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FtaarApi } from '../core/api/ftaar-api';
import { getApiError } from '../core/api/http-error';
import { SessionService } from '../core/session/session.service';
import { Banner, Field } from '../ui/ui';

@Component({
  selector: 'fta-convert-page',
  imports: [FormsModule, Banner, Field],
  template: `
    <div class="mx-auto max-w-lg space-y-4">
      <h2 class="text-xl font-semibold text-dc-header">
        Convert guest → registered
      </h2>
      <p class="text-sm text-dc-muted">
        POST /auth/convert keeps the same userId and lobby memberships.
      </p>
      @if (session.isRegistered()) {
        <p class="rounded-md bg-dc-secondary p-4 text-sm text-dc-muted">
          You are already registered.
        </p>
      } @else {
        <fta-banner [message]="error()" />
        <form
          class="space-y-5 rounded-md bg-dc-secondary p-4"
          (ngSubmit)="convert()"
        >
          <fta-field label="Email">
            <input
              class="h-10 w-full rounded-[3px] bg-dc-input px-2.5 outline-none"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              [(ngModel)]="email"
            />
          </fta-field>
          <fta-field label="Password">
            <input
              class="h-10 w-full rounded-[3px] bg-dc-input px-2.5 outline-none"
              name="password"
              type="password"
              required
              minlength="8"
              placeholder="At least 8 characters"
              [(ngModel)]="password"
            />
          </fta-field>
          <button
            class="h-10 rounded-[3px] bg-dc-green px-4 text-sm text-white"
          >
            Convert
          </button>
        </form>
      }
    </div>
  `,
})
export class ConvertPage {
  private readonly api = inject(FtaarApi);
  private readonly router = inject(Router);
  readonly session = inject(SessionService);
  email = '';
  password = '';
  readonly error = signal<string | null>(null);

  async convert(): Promise<void> {
    this.error.set(null);
    try {
      const session = await this.api.convert(this.email, this.password);
      this.session.applySession(session);
      await this.router.navigateByUrl('/account');
    } catch (err) {
      this.error.set(getApiError(err).message);
    }
  }
}
