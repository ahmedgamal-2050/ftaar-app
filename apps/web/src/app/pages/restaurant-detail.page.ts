import { Component, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FtaarApi } from '../core/api/ftaar-api';
import { getApiError } from '../core/api/http-error';
import type { MenuItem, Restaurant } from '../core/api/types';
import { SessionService } from '../core/session/session.service';
import { Banner, Field } from '../ui/ui';

@Component({
  selector: 'fta-restaurant-detail-page',
  imports: [FormsModule, Banner, Field],
  template: `
    <div class="mx-auto max-w-4xl space-y-5">
      <fta-banner [message]="error()" />
      @if (restaurant(); as rest) {
        <div class="rounded-md bg-dc-secondary p-4">
          <h2 class="text-xl font-semibold text-dc-header">{{ rest.name }}</h2>
          <p class="text-sm text-dc-muted">{{ rest.id }}</p>
          @if (session.isRegistered()) {
            <form class="mt-3 flex flex-wrap gap-2" (ngSubmit)="saveRest()">
              <input
                class="h-10 flex-1 rounded-[3px] bg-dc-input px-2.5 text-sm text-dc-header outline-none"
                name="name"
                [(ngModel)]="editName"
              />
              <label class="flex items-center gap-2 text-sm text-dc-muted">
                <input type="checkbox" name="active" [(ngModel)]="editActive" />
                Active
              </label>
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
            </form>
          }
        </div>

        <div class="rounded-md bg-dc-secondary p-4">
          <div class="mb-3 flex items-center justify-between">
            <h3 class="font-semibold text-dc-header">Menu</h3>
            <label class="text-sm text-dc-muted">
              <input
                type="checkbox"
                [ngModel]="includeInactive"
                (ngModelChange)="toggleInactive($event)"
              />
              Include inactive
            </label>
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
          <form
            class="grid gap-2 rounded-md bg-dc-secondary p-4 md:grid-cols-4"
            (ngSubmit)="addItem()"
          >
            <fta-field label="Name">
              <input
                class="h-10 w-full rounded-[3px] bg-dc-input px-2.5 text-sm outline-none"
                name="itemName"
                required
                [(ngModel)]="itemName"
              />
            </fta-field>
            <fta-field label="Category">
              <input
                class="h-10 w-full rounded-[3px] bg-dc-input px-2.5 text-sm outline-none"
                name="itemCategory"
                [(ngModel)]="itemCategory"
              />
            </fta-field>
            <fta-field label="Price (EGP)">
              <input
                class="h-10 w-full rounded-[3px] bg-dc-input px-2.5 text-sm outline-none"
                name="itemPrice"
                required
                [(ngModel)]="itemPrice"
              />
            </fta-field>
            <button
              class="mt-6 h-10 rounded-[3px] bg-dc-green text-sm text-white"
            >
              Add item
            </button>
          </form>

          @if (editingId) {
            <form class="flex flex-wrap gap-2" (ngSubmit)="saveItem()">
              <input
                class="h-10 rounded-[3px] bg-dc-input px-2.5 text-sm outline-none"
                name="editItemName"
                [(ngModel)]="editItemName"
              />
              <input
                class="h-10 rounded-[3px] bg-dc-input px-2.5 text-sm outline-none"
                name="editItemCat"
                [(ngModel)]="editItemCat"
              />
              <input
                class="h-10 rounded-[3px] bg-dc-input px-2.5 text-sm outline-none"
                name="editItemPrice"
                [(ngModel)]="editItemPrice"
              />
              <button
                class="h-10 rounded-[3px] bg-blurple px-3 text-sm text-white"
              >
                Save item
              </button>
            </form>
          }

          <form class="rounded-md bg-dc-secondary p-4" (ngSubmit)="bulk()">
            <fta-field label="Bulk JSON array">
              <textarea
                class="h-28 w-full rounded-[3px] bg-dc-input p-2 font-mono text-xs outline-none"
                name="bulkJson"
                [(ngModel)]="bulkJson"
              ></textarea>
            </fta-field>
            <button
              class="mt-2 h-9 rounded-[3px] bg-blurple px-3 text-sm text-white"
            >
              Bulk import
            </button>
          </form>
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
  editActive = true;
  itemName = '';
  itemCategory = '';
  itemPrice = '0.00';
  editingId: string | null = null;
  editItemName = '';
  editItemCat = '';
  editItemPrice = '';
  forceDelete = false;
  bulkJson = '[{"name":"كبسة","category":"أطباق","referencePrice":"36.87"}]';

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

  async addItem(): Promise<void> {
    try {
      await this.api.createMenuItem(this.id(), {
        name: this.itemName,
        category: this.itemCategory || undefined,
        referencePrice: this.itemPrice,
      });
      this.itemName = '';
      await this.reload();
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

  async bulk(): Promise<void> {
    try {
      const items = JSON.parse(this.bulkJson) as Array<{
        name: string;
        category?: string;
        referencePrice: string;
      }>;
      await this.api.bulkMenu(this.id(), items);
      await this.reload();
    } catch (err) {
      this.error.set(
        err instanceof SyntaxError ? 'Invalid JSON' : getApiError(err).message,
      );
    }
  }
}
