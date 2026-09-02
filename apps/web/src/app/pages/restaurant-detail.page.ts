import { Component, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FtaarApi } from '../core/api/ftaar-api';
import { getApiError } from '../core/api/http-error';
import type { MenuItem, Restaurant } from '../core/api/types';
import { SessionService } from '../core/session/session.service';
import { Banner, Field } from '../ui/ui';

@Component({
  selector: 'fta-restaurant-detail-page',
  imports: [FormsModule, RouterLink, Banner, Field],
  template: `
    <div class="mx-auto max-w-4xl space-y-5">
      <fta-banner [message]="error()" />
      @if (restaurant(); as rest) {
        <div class="rounded-md bg-dc-secondary p-4">
          <h2 class="text-xl font-semibold text-dc-header">{{ rest.name }}</h2>
          <p class="text-sm text-dc-muted">{{ rest.phone }}</p>
          <p class="text-sm text-dc-muted">{{ rest.note }}</p>
          <p class="text-xs text-dc-muted">{{ rest.id }}</p>
          @if (rest.image) {
            <img
              [src]="rest.image"
              [alt]="rest.name"
              class="mt-3 h-32 rounded object-cover"
            />
          }
          @if (session.isRegistered()) {
            <form
              class="mt-4 grid gap-4 md:grid-cols-2"
              (ngSubmit)="saveRest()"
            >
              <fta-field label="Name">
                <input
                  class="h-10 w-full rounded-[3px] bg-dc-input px-2.5 text-sm text-dc-header outline-none"
                  name="name"
                  placeholder="Restaurant name"
                  [(ngModel)]="editName"
                />
              </fta-field>
              <fta-field label="Phone">
                <input
                  class="h-10 w-full rounded-[3px] bg-dc-input px-2.5 text-sm text-dc-header outline-none"
                  name="phone"
                  placeholder="0100 000 0000"
                  [(ngModel)]="editPhone"
                />
              </fta-field>
              <fta-field label="Image URL" class="md:col-span-2">
                <input
                  class="h-10 w-full rounded-[3px] bg-dc-input px-2.5 text-sm text-dc-header outline-none"
                  name="image"
                  placeholder="https://example.com/photo.jpg"
                  [(ngModel)]="editImage"
                />
              </fta-field>
              <fta-field label="Note" class="md:col-span-2">
                <input
                  class="h-10 w-full rounded-[3px] bg-dc-input px-2.5 text-sm text-dc-header outline-none"
                  name="note"
                  placeholder="Delivery notes, hours, …"
                  [(ngModel)]="editNote"
                />
              </fta-field>
              <label class="flex items-center gap-2 text-sm text-dc-muted">
                <input type="checkbox" name="active" [(ngModel)]="editActive" />
                Active
              </label>
              <div class="flex gap-2">
                <button
                  class="h-10 rounded-[3px] bg-blurple px-3 text-sm text-white"
                >
                  PATCH
                </button>
                <button
                  type="button"
                  class="h-10 rounded-[3px] bg-dc-red px-3 text-sm text-white"
                  (click)="removeRest()"
                >
                  Soft delete
                </button>
              </div>
            </form>
          }
        </div>

        <div class="rounded-md bg-dc-secondary p-4">
          <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 class="font-semibold text-dc-header">Menu</h3>
            <div class="flex items-center gap-3">
              <label class="text-sm text-dc-muted">
                <input
                  type="checkbox"
                  [ngModel]="includeInactive"
                  (ngModelChange)="toggleInactive($event)"
                />
                Include inactive
              </label>
              @if (session.isRegistered()) {
                <a
                  [routerLink]="['/restaurants', rest.id, 'menu']"
                  class="h-8 rounded-[3px] bg-dc-green px-3 text-sm leading-8 text-white"
                >
                  Add item or bulk
                </a>
              }
            </div>
          </div>
          <div class="space-y-2">
            @for (item of menu(); track item.id) {
              <div
                class="flex flex-wrap items-center gap-2 rounded bg-dc-primary px-3 py-2"
              >
                <span class="min-w-40 font-medium text-dc-header">{{
                  item.name
                }}</span>
                <span class="text-xs text-dc-muted">{{ item.category }}</span>
                <span class="text-sm text-dc-normal"
                  >EGP {{ item.referencePrice }}</span
                >
                @if (session.isRegistered()) {
                  <button
                    class="ml-auto text-xs text-dc-link"
                    (click)="beginEdit(item)"
                  >
                    Edit
                  </button>
                  <button
                    class="text-xs text-dc-red"
                    (click)="removeItem(item.id)"
                  >
                    Delete
                  </button>
                }
              </div>
            }
          </div>
        </div>

        @if (session.isRegistered()) {
          @if (editingId) {
            <form class="grid gap-4 md:grid-cols-3" (ngSubmit)="saveItem()">
              <fta-field label="Name">
                <input
                  class="h-10 w-full rounded-[3px] bg-dc-input px-2.5 text-sm outline-none"
                  name="editItemName"
                  placeholder="Item name"
                  [(ngModel)]="editItemName"
                />
              </fta-field>
              <fta-field label="Category">
                <input
                  class="h-10 w-full rounded-[3px] bg-dc-input px-2.5 text-sm outline-none"
                  name="editItemCat"
                  placeholder="أطباق"
                  [(ngModel)]="editItemCat"
                />
              </fta-field>
              <fta-field label="Price (EGP)">
                <input
                  class="h-10 w-full rounded-[3px] bg-dc-input px-2.5 text-sm outline-none"
                  name="editItemPrice"
                  placeholder="36.87"
                  [(ngModel)]="editItemPrice"
                />
              </fta-field>
              <button
                class="h-10 self-end rounded-[3px] bg-blurple px-3 text-sm text-white"
              >
                Save item
              </button>
            </form>
          }

          <label class="text-sm text-dc-muted">
            <input type="checkbox" [(ngModel)]="forceDelete" name="force" />
            Force delete referenced items
          </label>
        }
      }
    </div>
  `,
})
export class RestaurantDetailPage implements OnInit {
  readonly id = input.required<string>();
  private readonly api = inject(FtaarApi);
  private readonly router = inject(Router);
  readonly session = inject(SessionService);
  readonly restaurant = signal<Restaurant | null>(null);
  readonly menu = signal<MenuItem[]>([]);
  readonly error = signal<string | null>(null);
  includeInactive = false;
  editName = '';
  editPhone = '';
  editImage = '';
  editNote = '';
  editActive = true;
  editingId: string | null = null;
  editItemName = '';
  editItemCat = '';
  editItemPrice = '';
  forceDelete = false;

  ngOnInit(): void {
    void this.reload();
  }

  async reload(): Promise<void> {
    this.error.set(null);
    try {
      const rest = await this.api.getRestaurant(
        this.id(),
        this.includeInactive,
      );
      this.restaurant.set(rest);
      this.editName = rest.name;
      this.editPhone = rest.phone;
      this.editImage = rest.image;
      this.editNote = rest.note ?? '';
      this.editActive = rest.isActive;
      this.menu.set(
        rest.menu ?? (await this.api.listMenu(this.id(), this.includeInactive)),
      );
    } catch (err) {
      this.error.set(getApiError(err).message);
    }
  }

  async toggleInactive(value: boolean): Promise<void> {
    this.includeInactive = value;
    await this.reload();
  }

  async saveRest(): Promise<void> {
    try {
      await this.api.updateRestaurant(this.id(), {
        name: this.editName,
        phone: this.editPhone,
        image: this.editImage,
        note: this.editNote || null,
        isActive: this.editActive,
      });
      await this.reload();
    } catch (err) {
      this.error.set(getApiError(err).message);
    }
  }

  async removeRest(): Promise<void> {
    try {
      await this.api.deleteRestaurant(this.id());
      await this.router.navigateByUrl('/restaurants');
    } catch (err) {
      this.error.set(getApiError(err).message);
    }
  }

  beginEdit(item: MenuItem): void {
    this.editingId = item.id;
    this.editItemName = item.name;
    this.editItemCat = item.category;
    this.editItemPrice = item.referencePrice;
  }

  async saveItem(): Promise<void> {
    if (!this.editingId) {
      return;
    }
    try {
      await this.api.updateMenuItem(this.editingId, {
        name: this.editItemName,
        category: this.editItemCat,
        referencePrice: this.editItemPrice,
      });
      this.editingId = null;
      await this.reload();
    } catch (err) {
      this.error.set(getApiError(err).message);
    }
  }

  async removeItem(id: string): Promise<void> {
    try {
      await this.api.deleteMenuItem(id, this.forceDelete);
      await this.reload();
    } catch (err) {
      this.error.set(getApiError(err).message);
    }
  }
}
