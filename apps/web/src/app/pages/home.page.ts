import { Component, inject, signal } from '@angular/core';
import { FtaarApi } from '../core/api/ftaar-api';
import { getApiError } from '../core/api/http-error';
import { SessionService } from '../core/session/session.service';
import { Banner } from '../ui/ui';

@Component({
  selector: 'fta-home-page',
  imports: [Banner],
  template: `
    <div class="mx-auto max-w-2xl space-y-4">
      <div class="rounded-md bg-dc-secondary p-4">
        <p class="text-xs font-bold uppercase tracking-wide text-dc-muted">
          GET /api
        </p>
        <p class="mt-2 text-lg text-dc-header">
          {{ hello() ?? 'Hello API is one click away.' }}
        </p>
        <button
          class="mt-3 h-9 rounded-[3px] bg-blurple px-3 text-sm text-white hover:bg-blurple-hover"
          (click)="loadHello()"
        >
          Ping hello
        </button>
      </div>
      <fta-banner [message]="error()" />
      <p class="text-sm text-dc-muted">
        Signed in as
        <span class="text-dc-header">{{ session.user()?.displayName }}</span>
        ({{ session.user()?.kind }}). Use the server rail on the left — Catalog,
        Lobbies, Account, Ops — to hit every backend route.
      </p>
    </div>
  `,
})
export class HomePage {
  private readonly api = inject(FtaarApi);
  readonly session = inject(SessionService);
  readonly hello = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  async loadHello(): Promise<void> {
    this.error.set(null);
    try {
      const res = await this.api.hello();
      this.hello.set(res.message);
    } catch (err) {
      this.error.set(getApiError(err).message);
    }
  }
}
