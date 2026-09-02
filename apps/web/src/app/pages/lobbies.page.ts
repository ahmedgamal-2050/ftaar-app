import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FtaarApi } from '../core/api/ftaar-api';
import { getApiError } from '../core/api/http-error';
import { SessionService } from '../core/session/session.service';
import { Banner, Field } from '../ui/ui';

@Component({
  selector: 'fta-lobbies-page',
  imports: [FormsModule, Banner, Field],
  template: `
    <div class="mx-auto grid max-w-4xl gap-4 md:grid-cols-2">
      <fta-banner class="md:col-span-2" [message]="error()" />
      <form
        class="space-y-5 rounded-md bg-dc-secondary p-4"
        (ngSubmit)="join()"
      >
        <h2 class="font-semibold text-dc-header">Join by code</h2>
        <fta-field label="Code">
          <input
            class="h-10 w-full rounded-[3px] bg-dc-input px-2.5 uppercase outline-none"
            name="code"
            required
            maxlength="6"
            placeholder="ABC123"
            [(ngModel)]="code"
          />
        </fta-field>
        <fta-field label="Display name (optional)">
          <input
            class="h-10 w-full rounded-[3px] bg-dc-input px-2.5 outline-none"
            name="displayName"
            placeholder="Shown to other members"
            [(ngModel)]="displayName"
          />
        </fta-field>
        <button class="h-10 w-full rounded-[3px] bg-blurple text-sm text-white">
          Join
        </button>
      </form>

      @if (session.isRegistered()) {
        <form
          class="space-y-5 rounded-md bg-dc-secondary p-4"
          (ngSubmit)="create()"
        >
          <h2 class="font-semibold text-dc-header">Create lobby</h2>
          <fta-field label="Restaurant UUID">
            <input
              class="h-10 w-full rounded-[3px] bg-dc-input px-2.5 outline-none"
              name="restaurantId"
              required
              placeholder="Restaurant id from catalog"
              [(ngModel)]="restaurantId"
            />
          </fta-field>
          <fta-field label="Max members">
            <input
              class="h-10 w-full rounded-[3px] bg-dc-input px-2.5 outline-none"
              name="maxMembers"
              type="number"
              min="2"
              placeholder="8"
              [(ngModel)]="maxMembers"
            />
          </fta-field>
          <fta-field label="Expiry minutes">
            <input
              class="h-10 w-full rounded-[3px] bg-dc-input px-2.5 outline-none"
              name="expiryMinutes"
              type="number"
              min="1"
              placeholder="30"
              [(ngModel)]="expiryMinutes"
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
          <button
            class="h-10 w-full rounded-[3px] bg-dc-green text-sm text-white"
          >
            Create
          </button>
        </form>
      } @else {
        <p class="rounded-md bg-dc-secondary p-4 text-sm text-dc-muted">
          Convert your guest account to create lobbies.
        </p>
      }
    </div>
  `,
})
export class LobbiesPage {
  private readonly api = inject(FtaarApi);
  private readonly router = inject(Router);
  readonly session = inject(SessionService);
  code = '';
  displayName = '';
  restaurantId = '';
  maxMembers: number | null = 8;
  expiryMinutes: number | null = 30;
  instaPay = '';
  readonly error = signal<string | null>(null);

  async join(): Promise<void> {
    this.error.set(null);
    try {
      const result = await this.api.joinLobby(
        this.code,
        this.displayName || undefined,
      );
      await this.router.navigate(['/lobbies', result.lobby.id]);
    } catch (err) {
      this.error.set(getApiError(err).message);
    }
  }

  async create(): Promise<void> {
    this.error.set(null);
    try {
      const lobby = await this.api.createLobby({
        restaurantId: this.restaurantId,
        maxMembers: this.maxMembers || undefined,
        expiryMinutes: this.expiryMinutes || undefined,
        instaPayHandle: this.instaPay || undefined,
      });
      await this.router.navigate(['/lobbies', lobby.id]);
    } catch (err) {
      this.error.set(getApiError(err).message);
    }
  }
}
