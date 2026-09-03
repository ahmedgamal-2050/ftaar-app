import {
  Component,
  computed,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FtaarApi } from '../core/api/ftaar-api';
import { getApiError } from '../core/api/http-error';
import type {
  KitchenSummary,
  Lobby,
  LobbyOrdersSummary,
  MemberOrderSummary,
  MenuItem,
} from '../core/api/types';
import { SessionService } from '../core/session/session.service';
import { Banner, Field } from '../ui/ui';

@Component({
  selector: 'fta-lobby-orders-page',
  imports: [FormsModule, Banner, Field],
  template: `
    <div class="mx-auto max-w-5xl space-y-4">
      <fta-banner [message]="error()" />
      @if (lobby(); as room) {
        <p class="text-sm text-dc-muted">
          {{ room.code }} · {{ room.status }} · cart is editable while
          <span class="text-dc-header">open</span>
        </p>
      }

      <div class="grid gap-4 lg:grid-cols-2">
        <section class="rounded-md bg-dc-secondary p-4">
          <h2 class="mb-3 font-semibold text-dc-header">Menu</h2>
          <div class="space-y-2">
            @for (item of menu(); track item.id) {
              <div
                class="flex items-center gap-2 rounded bg-dc-primary px-3 py-2"
              >
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-medium text-dc-header">
                    {{ item.name }}
                  </p>
                  <p class="text-xs text-dc-muted">
                    {{ item.category }} · EGP {{ item.referencePrice }}
                  </p>
                </div>
                <button
                  class="h-8 rounded-[3px] bg-dc-green px-2 text-xs text-white"
                  (click)="add(item.id)"
                >
                  Add
                </button>
              </div>
            }
          </div>
        </section>

        <section class="rounded-md bg-dc-secondary p-4">
          <div class="mb-3 flex items-center justify-between">
            <h2 class="font-semibold text-dc-header">My order</h2>
            <span class="text-sm text-dc-muted"
              >subtotal EGP {{ mine()?.subtotal ?? '0.00' }}</span
            >
          </div>
          @for (line of mine()?.items ?? []; track line.id) {
            <div
              class="mb-3 flex items-end gap-3 rounded bg-dc-primary px-3 py-2"
            >
              <div class="min-w-0 flex-1">
                <p class="text-sm text-dc-header">
                  {{ line.menuItem?.name ?? line.menuItemId }}
                </p>
                <p class="text-xs text-dc-muted">
                  EGP {{ line.actualPrice }} · line {{ line.lineTotal }}
                </p>
              </div>
              <fta-field label="Qty">
                <input
                  class="h-8 w-16 rounded-[3px] bg-dc-input px-2 text-sm outline-none"
                  type="number"
                  min="1"
                  placeholder="1"
                  [ngModel]="line.qty"
                  [ngModelOptions]="{ standalone: true }"
                  (change)="setQty(line.id, $event)"
                />
              </fta-field>
              <button class="text-xs text-dc-red" (click)="remove(line.id)">
                Remove
              </button>
            </div>
          }
        </section>
      </div>

      @if (isAdmin()) {
        <section class="rounded-md bg-dc-secondary p-4">
          <h2 class="mb-3 font-semibold text-dc-header">Admin</h2>
          <div class="mb-3 flex flex-wrap gap-2">
            <button
              class="h-8 rounded-[3px] bg-dc-hover px-3 text-xs text-white"
              (click)="loadRoster()"
            >
              GET roster
            </button>
            <button
              class="h-8 rounded-[3px] bg-dc-hover px-3 text-xs text-white"
              (click)="loadKitchen()"
            >
              GET kitchen summary
            </button>
          </div>
          <form
            class="mb-4 flex flex-wrap items-end gap-4"
            (ngSubmit)="override()"
          >
            <fta-field label="Menu item UUID">
              <input
                class="h-9 w-64 rounded-[3px] bg-dc-input px-2 text-sm outline-none"
                name="overrideMenuId"
                placeholder="Menu item id"
                [(ngModel)]="overrideMenuId"
              />
            </fta-field>
            <fta-field label="Actual price">
              <input
                class="h-9 w-28 rounded-[3px] bg-dc-input px-2 text-sm outline-none"
                name="overridePrice"
                placeholder="35.00"
                [(ngModel)]="overridePrice"
              />
            </fta-field>
            <button
              class="h-9 rounded-[3px] bg-blurple px-3 text-sm text-white"
            >
              Override price
            </button>
          </form>
          @if (roster(); as all) {
            <p class="mb-2 text-xs text-dc-muted">
              Grand subtotal EGP {{ all.subtotal }}
            </p>
            @for (line of all.items; track line.id) {
              <div
                class="mb-1 flex justify-between rounded bg-dc-primary px-3 py-1.5 text-sm"
              >
                <span class="text-dc-header"
                  >{{ line.lobbyMember?.displayName }} ·
                  {{ line.menuItem?.name }} ×{{ line.qty }}</span
                >
                <span class="text-dc-muted">EGP {{ line.lineTotal }}</span>
              </div>
            }
          }
          @if (kitchen(); as sum) {
            <div class="mt-4">
              <p class="mb-2 text-xs text-dc-muted">
                {{ sum.totalItemsCount }} items · EGP {{ sum.grandTotal }}
              </p>
              @for (row of sum.items; track row.menuItemId) {
                <div
                  class="mb-1 flex justify-between rounded bg-dc-primary px-3 py-1.5 text-sm"
                >
                  <span class="text-dc-header"
                    >{{ row.name }} ×{{ row.totalQty }}</span
                  >
                  <span class="text-dc-muted">EGP {{ row.totalPrice }}</span>
                </div>
              }
            </div>
          }
        </section>
      }
    </div>
  `,
})
export class LobbyOrdersPage implements OnInit {
  readonly id = input.required<string>();
  private readonly api = inject(FtaarApi);
  readonly session = inject(SessionService);
  readonly lobby = signal<Lobby | null>(null);
  readonly menu = signal<MenuItem[]>([]);
  readonly mine = signal<MemberOrderSummary | null>(null);
  readonly roster = signal<LobbyOrdersSummary | null>(null);
  readonly kitchen = signal<KitchenSummary | null>(null);
  readonly error = signal<string | null>(null);
  overrideMenuId = '';
  overridePrice = '35.00';

  readonly isAdmin = computed(() => {
    const userId = this.session.user()?.id;
    return (
      this.lobby()?.members.some(
        (member) => member.userId === userId && member.role === 'admin',
      ) === true
    );
  });

  ngOnInit(): void {
    void this.reload();
  }

  async reload(): Promise<void> {
    this.error.set(null);
    try {
      const lobby = await this.api.getLobby(this.id());
      this.lobby.set(lobby);
      const restaurant = await this.api.getRestaurant(lobby.restaurantId);
      this.menu.set(restaurant.menu ?? []);
      this.mine.set(await this.api.myOrder(this.id()));
      if (this.isAdmin()) {
        await this.loadRoster();
      }
    } catch (err) {
      this.error.set(getApiError(err).message);
    }
  }

  async add(menuItemId: string): Promise<void> {
    this.error.set(null);
    try {
      this.mine.set(await this.api.addOrderItem(this.id(), menuItemId, 1));
    } catch (err) {
      this.error.set(getApiError(err).message);
    }
  }

  async setQty(itemId: string, event: Event): Promise<void> {
    const value = Number((event.target as HTMLInputElement).value);
    if (!Number.isInteger(value) || value < 1) {
      return;
    }
    this.error.set(null);
    try {
      this.mine.set(await this.api.updateOrderItem(this.id(), itemId, value));
    } catch (err) {
      this.error.set(getApiError(err).message);
    }
  }

  async remove(itemId: string): Promise<void> {
    this.error.set(null);
    try {
      this.mine.set(await this.api.removeOrderItem(this.id(), itemId));
    } catch (err) {
      this.error.set(getApiError(err).message);
    }
  }

  async loadRoster(): Promise<void> {
    this.error.set(null);
    try {
      this.roster.set(await this.api.adminOrders(this.id()));
    } catch (err) {
      this.error.set(getApiError(err).message);
    }
  }

  async loadKitchen(): Promise<void> {
    this.error.set(null);
    try {
      this.kitchen.set(await this.api.kitchenSummary(this.id()));
    } catch (err) {
      this.error.set(getApiError(err).message);
    }
  }

  async override(): Promise<void> {
    this.error.set(null);
    try {
      await this.api.overrideMenuItemPrice(
        this.id(),
        this.overrideMenuId,
        this.overridePrice,
      );
      await this.reload();
    } catch (err) {
      this.error.set(getApiError(err).message);
    }
  }
}
