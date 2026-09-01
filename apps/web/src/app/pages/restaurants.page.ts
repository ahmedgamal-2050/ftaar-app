import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FtaarApi } from '../core/api/ftaar-api';
import { getApiError } from '../core/api/http-error';
import type { RestaurantList } from '../core/api/types';
import { SessionService } from '../core/session/session.service';
import { Banner, Field } from '../ui/ui';

@Component({
  selector: 'fta-restaurants-page',
  imports: [FormsModule, RouterLink, Banner, Field],
  template: `
    <div class="mx-auto max-w-3xl space-y-4">
      <form class="flex flex-wrap items-end gap-2" (ngSubmit)="load()">
        <fta-field label="Search">
          <input
            class="h-10 w-56 rounded-[3px] bg-dc-input px-2.5 text-sm text-dc-header outline-none"
            name="search"
            [(ngModel)]="search"
          />
        </fta-field>
        <fta-field label="Page">
          <input
            class="h-10 w-20 rounded-[3px] bg-dc-input px-2.5 text-sm text-dc-header outline-none"
            name="page"
            type="number"
            min="1"
            [(ngModel)]="page"
          />
        </fta-field>
        <label class="flex items-center gap-2 text-sm text-dc-muted">
          <input
            type="checkbox"
            name="inactive"
            [(ngModel)]="includeInactive"
          />
          Include inactive
        </label>
        <button
          class="h-10 rounded-[3px] bg-blurple px-3 text-sm text-white hover:bg-blurple-hover"
        >
          Search
        </button>
      </form>

      @if (session.isRegistered()) {
        <form class="flex gap-2" (ngSubmit)="create()">
          <input
            class="h-10 flex-1 rounded-[3px] bg-dc-input px-2.5 text-sm text-dc-header outline-none"
            name="name"
            required
            minlength="2"
            placeholder="New restaurant name"
            [(ngModel)]="newName"
          />
          <button
            class="h-10 rounded-[3px] bg-dc-green px-3 text-sm text-white hover:bg-dc-green-hover"
          >
            Create
          </button>
        </form>
      }

      <fta-banner [message]="error()" />

      @if (list(); as data) {
        <p class="text-xs text-dc-muted">
          {{ data.total }} restaurants · page {{ data.page }} / limit
          {{ data.limit }}
        </p>
        <div class="overflow-hidden rounded-md bg-dc-secondary">
          @for (item of data.items; track item.id) {
            <a
              [routerLink]="['/restaurants', item.id]"
              class="flex items-center justify-between border-b border-black/20 px-4 py-3 last:border-0 hover:bg-dc-hover"
            >
              <span class="font-medium text-dc-header">{{ item.name }}</span>
              <span
                class="text-xs"
                [class.text-dc-green]="item.isActive"
                [class.text-dc-muted]="!item.isActive"
                >{{ item.isActive ? 'active' : 'inactive' }}</span
              >
            </a>
          }
        </div>
      }
    </div>
  `,
})
export class RestaurantsPage {
  private readonly api = inject(FtaarApi);
  readonly session = inject(SessionService);
  search = '';
  page = 1;
  includeInactive = false;
  newName = '';
  readonly list = signal<RestaurantList | null>(null);
  readonly error = signal<string | null>(null);

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.error.set(null);
    try {
      this.list.set(
        await this.api.listRestaurants({
          search: this.search || undefined,
          page: this.page,
          limit: 20,
          includeInactive: this.includeInactive,
        }),
      );
    } catch (err) {
      this.error.set(getApiError(err).message);
    }
  }

  async create(): Promise<void> {
    this.error.set(null);
    try {
      await this.api.createRestaurant(this.newName);
      this.newName = '';
      await this.load();
    } catch (err) {
      this.error.set(getApiError(err).message);
    }
  }
}
