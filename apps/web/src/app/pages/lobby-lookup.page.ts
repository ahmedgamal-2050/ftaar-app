import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FtaarApi } from '../core/api/ftaar-api';
import { getApiError } from '../core/api/http-error';
import type { Lobby } from '../core/api/types';
import { Banner, Field } from '../ui/ui';

@Component({
  selector: 'fta-lobby-lookup-page',
  imports: [FormsModule, Banner, Field],
  template: `
    <div class="mx-auto max-w-xl space-y-4">
      <form class="flex items-end gap-4" (ngSubmit)="lookup()">
        <fta-field class="flex-1" label="Share code">
          <input
            class="h-10 w-full rounded-[3px] bg-dc-input px-2.5 uppercase outline-none"
            name="code"
            required
            maxlength="6"
            placeholder="ABC123"
            [(ngModel)]="code"
          />
        </fta-field>
        <button
          class="h-10 rounded-[3px] bg-blurple px-3 text-sm text-white"
        >
          GET /lobbies/code/:code
        </button>
      </form>
      <fta-banner [message]="error()" />
      @if (lobby(); as item) {
        <button
          class="w-full rounded-md bg-dc-secondary p-4 text-left hover:bg-dc-hover"
          (click)="open(item.id)"
        >
          <p class="text-lg font-semibold text-dc-header">{{ item.code }}</p>
          <p class="text-sm text-dc-muted">
            {{ item.status }} · {{ item.memberCount }} members ·
            {{ item.restaurant?.name }}
          </p>
        </button>
      }
    </div>
  `,
})
export class LobbyLookupPage {
  private readonly api = inject(FtaarApi);
  private readonly router = inject(Router);
  code = '';
  readonly lobby = signal<Lobby | null>(null);
  readonly error = signal<string | null>(null);

  async lookup(): Promise<void> {
    this.error.set(null);
    try {
      this.lobby.set(await this.api.lobbyByCode(this.code));
    } catch (err) {
      this.error.set(getApiError(err).message);
    }
  }

  open(id: string): void {
    void this.router.navigate(['/lobbies', id]);
  }
}
