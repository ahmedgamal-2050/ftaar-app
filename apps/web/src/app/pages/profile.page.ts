import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FtaarApi } from '../core/api/ftaar-api';
import { getApiError } from '../core/api/http-error';
import { SessionService } from '../core/session/session.service';
import { Banner, Field, OkBanner } from '../ui/ui';

@Component({
  selector: 'fta-profile-page',
  imports: [FormsModule, Banner, Field, OkBanner],
  template: `
    <div class="mx-auto max-w-lg space-y-4">
      <fta-banner [message]="error()" />
      <fta-ok [message]="info()" />
      <div class="rounded-md bg-dc-secondary p-4">
        <p class="text-sm text-dc-muted">GET /auth/me</p>
        <p class="mt-1 text-lg font-semibold text-dc-header">
          {{ session.user()?.displayName }}
        </p>
        <p class="text-sm text-dc-muted">{{ session.user()?.email }}</p>
        <p class="text-xs text-dc-muted">{{ session.user()?.id }}</p>
        <button
          class="mt-3 h-8 rounded-[3px] bg-dc-hover px-3 text-xs text-white"
          (click)="refreshMe()"
        >
          Reload profile
        </button>
      </div>
      @if (session.isRegistered()) {
        <form
          class="space-y-5 rounded-md bg-dc-secondary p-4"
          (ngSubmit)="save()"
        >
          <fta-field label="Display name">
            <input
              class="h-10 w-full rounded-[3px] bg-dc-input px-2.5 outline-none"
              name="displayName"
              placeholder="How you appear in lobbies"
              [(ngModel)]="displayName"
            />
          </fta-field>
          <fta-field label="InstaPay handle">
            <input
              class="h-10 w-full rounded-[3px] bg-dc-input px-2.5 outline-none"
              name="instaPay"
              placeholder="instapay username"
              [(ngModel)]="instaPay"
            />
          </fta-field>
          <button class="h-10 rounded-[3px] bg-blurple px-4 text-sm text-white">
            PATCH /auth/me
          </button>
        </form>
      }
      <button
        class="h-10 rounded-[3px] bg-dc-red px-4 text-sm text-white"
        (click)="logout()"
      >
        Log Out
      </button>
    </div>
  `,
})
export class ProfilePage {
  private readonly api = inject(FtaarApi);
  readonly session = inject(SessionService);
  displayName = this.session.user()?.displayName ?? '';
  instaPay = this.session.user()?.instaPayHandle ?? '';
  readonly error = signal<string | null>(null);
  readonly info = signal<string | null>(null);

  async refreshMe(): Promise<void> {
    try {
      const user = await this.api.me();
      this.session.user.set(user);
      this.displayName = user.displayName;
      this.instaPay = user.instaPayHandle ?? '';
    } catch (err) {
      this.error.set(getApiError(err).message);
    }
  }

  async save(): Promise<void> {
    this.error.set(null);
    try {
      const user = await this.api.updateMe({
        displayName: this.displayName,
        instaPayHandle: this.instaPay || undefined,
      });
      this.session.user.set(user);
      this.info.set('Profile updated');
    } catch (err) {
      this.error.set(getApiError(err).message);
    }
  }

  logout(): void {
    void this.session.logout();
  }
}
