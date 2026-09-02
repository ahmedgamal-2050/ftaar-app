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
      <form class="flex flex-wrap items-end gap-4" (ngSubmit)="load()">
        <fta-field label="Search">
          <input
            class="h-10 w-56 rounded-[3px] bg-dc-input px-2.5 text-sm text-dc-header outline-none"
            name="search"
            placeholder="Restaurant name"
            [(ngModel)]="search"
          />
        </fta-field>
        <fta-field label="Page">
          <input
            class="h-10 w-20 rounded-[3px] bg-dc-input px-2.5 text-sm text-dc-header outline-none"
            name="page"
            type="number"
            min="1"
            placeholder="1"
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
        <form
          class="grid gap-4 rounded-md bg-dc-secondary p-4 md:grid-cols-2"
          (ngSubmit)="create()"
        >
          <fta-field label="Name">
            <input
              class="h-10 w-full rounded-[3px] bg-dc-input px-2.5 text-sm text-dc-header outline-none"
              name="name"
              required
              minlength="2"
              placeholder="Restaurant name"
              [(ngModel)]="newName"
            />
          </fta-field>
          <fta-field label="Phone">
            <input
              class="h-10 w-full rounded-[3px] bg-dc-input px-2.5 text-sm text-dc-header outline-none"
              name="phone"
              required
              minlength="5"
              placeholder="0100 000 0000"
              [(ngModel)]="newPhone"
            />
          </fta-field>
          <fta-field label="Image URL" class="md:col-span-2">
            <input
              class="h-10 w-full rounded-[3px] bg-dc-input px-2.5 text-sm text-dc-header outline-none"
              name="image"
              required
              placeholder="https://example.com/photo.jpg"
              [(ngModel)]="newImage"
            />
          </fta-field>
          <fta-field label="Note (optional)" class="md:col-span-2">
            <input
              class="h-10 w-full rounded-[3px] bg-dc-input px-2.5 text-sm text-dc-header outline-none"
              name="note"
              placeholder="Delivery notes, hours, …"
              [(ngModel)]="newNote"
            />
          </fta-field>
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
              class="flex items-center gap-3 border-b border-black/20 px-4 py-3 last:border-0 hover:bg-dc-hover"
            >
              <img
                [src]="item.image"
                [alt]="item.name"
                class="h-10 w-10 rounded object-cover"
              />
              <span class="min-w-0 flex-1">
                <span class="block font-medium text-dc-header">{{
                  item.name
                }}</span>
                <span class="block truncate text-xs text-dc-muted">{{
                  item.phone
                }}</span>
              </span>
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
  newPhone = '';
  newImage = '';
  newNote = '';
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
      await this.api.createRestaurant({
        name: this.newName,
        phone: this.newPhone,
        image: this.newImage,
        note: this.newNote || undefined,
      });
      this.newName = '';
      this.newPhone = '';
      this.newImage = '';
      this.newNote = '';
      await this.load();
    } catch (err) {
      this.error.set(getApiError(err).message);
    }
  }
}
