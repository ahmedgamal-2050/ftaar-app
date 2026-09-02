import { Component, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FtaarApi } from '../core/api/ftaar-api';
import { getApiError } from '../core/api/http-error';
import type { Restaurant } from '../core/api/types';
import { SessionService } from '../core/session/session.service';
import { Banner, Field, OkBanner } from '../ui/ui';

type MenuMode = 'item' | 'bulk';

interface MenuDraft {
  name: string;
  category: string;
  referencePrice: string;
  isActive: boolean;
}

function emptyDraft(): MenuDraft {
  return {
    name: '',
    category: '',
    referencePrice: '0.00',
    isActive: true,
  };
}

@Component({
  selector: 'fta-menu-form-page',
  imports: [FormsModule, RouterLink, Banner, Field, OkBanner],
  template: `
    <div class="mx-auto max-w-3xl space-y-4">
      <a
        [routerLink]="['/restaurants', id()]"
        class="text-sm text-dc-link hover:underline"
        >← {{ restaurant()?.name ?? 'Restaurant' }}</a
      >
      <h2 class="text-xl font-semibold text-dc-header">Add menu</h2>
      <p class="text-sm text-dc-muted">
        Create one item or import up to 200 in a single request.
      </p>

      <fta-banner [message]="error()" />
      <fta-ok [message]="ok()" />

      @if (!session.isRegistered()) {
        <p class="rounded-md bg-dc-secondary p-4 text-sm text-dc-muted">
          Menu writes need a registered account.
          <a routerLink="/account/convert" class="text-dc-link hover:underline"
            >Convert guest → registered</a
          >
        </p>
      } @else {
        <div class="flex gap-1 rounded-md bg-dc-secondary p-1">
          <button
            type="button"
            class="h-9 flex-1 rounded-[3px] text-sm"
            [class.bg-blurple]="mode() === 'item'"
            [class.text-white]="mode() === 'item'"
            [class.text-dc-muted]="mode() !== 'item'"
            (click)="setMode('item')"
          >
            One item
          </button>
          <button
            type="button"
            class="h-9 flex-1 rounded-[3px] text-sm"
            [class.bg-blurple]="mode() === 'bulk'"
            [class.text-white]="mode() === 'bulk'"
            [class.text-dc-muted]="mode() !== 'bulk'"
            (click)="setMode('bulk')"
          >
            Bulk
          </button>
        </div>

        @if (mode() === 'item') {
          <form
            class="space-y-5 rounded-md bg-dc-secondary p-4"
            (ngSubmit)="addItem()"
          >
            <fta-field label="Name">
              <input
                class="h-10 w-full rounded-[3px] bg-dc-input px-2.5 text-sm text-dc-header outline-none"
                name="itemName"
                required
                maxlength="255"
                placeholder="كبسة دجاج"
                [(ngModel)]="item.name"
              />
            </fta-field>
            <fta-field label="Category">
              <input
                class="h-10 w-full rounded-[3px] bg-dc-input px-2.5 text-sm text-dc-header outline-none"
                name="itemCategory"
                maxlength="120"
                placeholder="أطباق"
                [(ngModel)]="item.category"
              />
            </fta-field>
            <fta-field label="Price (EGP)">
              <input
                class="h-10 w-full rounded-[3px] bg-dc-input px-2.5 text-sm text-dc-header outline-none"
                name="itemPrice"
                required
                placeholder="36.87"
                [(ngModel)]="item.referencePrice"
              />
            </fta-field>
            <label class="flex items-center gap-2 text-sm text-dc-muted">
              <input
                type="checkbox"
                name="itemActive"
                [(ngModel)]="item.isActive"
              />
              Active
            </label>
            <button
              class="h-10 rounded-[3px] bg-dc-green px-4 text-sm text-white disabled:opacity-50"
              [disabled]="busy()"
            >
              Add item
            </button>
          </form>
        } @else {
          <form
            class="space-y-5 rounded-md bg-dc-secondary p-4"
            (ngSubmit)="addBulk()"
          >
            <div class="space-y-4">
              @for (row of rows; track $index) {
                <div
                  class="grid gap-4 rounded bg-dc-primary p-3 md:grid-cols-[1fr_8rem_6rem_auto_auto]"
                >
                  <fta-field label="Name">
                    <input
                      class="h-10 w-full rounded-[3px] bg-dc-input px-2.5 text-sm text-dc-header outline-none"
                      [name]="'bulkName' + $index"
                      required
                      maxlength="255"
                      placeholder="كبسة دجاج"
                      [(ngModel)]="row.name"
                    />
                  </fta-field>
                  <fta-field label="Category">
                    <input
                      class="h-10 w-full rounded-[3px] bg-dc-input px-2.5 text-sm text-dc-header outline-none"
                      [name]="'bulkCat' + $index"
                      maxlength="120"
                      placeholder="أطباق"
                      [(ngModel)]="row.category"
                    />
                  </fta-field>
                  <fta-field label="Price">
                    <input
                      class="h-10 w-full rounded-[3px] bg-dc-input px-2.5 text-sm text-dc-header outline-none"
                      [name]="'bulkPrice' + $index"
                      required
                      placeholder="36.87"
                      [(ngModel)]="row.referencePrice"
                    />
                  </fta-field>
                  <label
                    class="flex items-center gap-1 self-end pb-2 text-xs text-dc-muted"
                  >
                    <input
                      type="checkbox"
                      [name]="'bulkActive' + $index"
                      [(ngModel)]="row.isActive"
                    />
                    Active
                  </label>
                  <button
                    type="button"
                    class="h-10 self-end rounded-[3px] px-2 text-xs text-dc-red disabled:opacity-40"
                    [disabled]="rows.length === 1"
                    (click)="removeRow($index)"
                  >
                    Remove
                  </button>
                </div>
              }
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                class="h-9 rounded-[3px] bg-dc-primary px-3 text-sm text-dc-header"
                (click)="addRow()"
              >
                Add row
              </button>
              <button
                class="h-9 rounded-[3px] bg-dc-green px-3 text-sm text-white disabled:opacity-50"
                [disabled]="busy()"
              >
                Bulk import
              </button>
            </div>
            <fta-field label="Or paste JSON array">
              <textarea
                class="h-24 w-full rounded-[3px] bg-dc-input p-2 font-mono text-xs text-dc-header outline-none"
                name="bulkJson"
                [(ngModel)]="bulkJson"
                placeholder='[{"name":"كبسة","category":"أطباق","referencePrice":"36.87"}]'
              ></textarea>
            </fta-field>
            <button
              type="button"
              class="h-9 rounded-[3px] bg-blurple px-3 text-sm text-white"
              (click)="applyJson()"
            >
              Load JSON into rows
            </button>
          </form>
        }
      }
    </div>
  `,
})
export class MenuFormPage implements OnInit {
  readonly id = input.required<string>();
  private readonly api = inject(FtaarApi);
  private readonly router = inject(Router);
  readonly session = inject(SessionService);
  readonly restaurant = signal<Restaurant | null>(null);
  readonly error = signal<string | null>(null);
  readonly ok = signal<string | null>(null);
  readonly busy = signal(false);
  readonly mode = signal<MenuMode>('item');
  item: MenuDraft = emptyDraft();
  rows: MenuDraft[] = [emptyDraft()];
  bulkJson = '[{"name":"كبسة","category":"أطباق","referencePrice":"36.87"}]';

  ngOnInit(): void {
    void this.loadRestaurant();
  }

  setMode(mode: MenuMode): void {
    this.mode.set(mode);
    this.error.set(null);
    this.ok.set(null);
  }

  addRow(): void {
    if (this.rows.length >= 200) {
      this.error.set('Bulk import allows at most 200 items.');
      return;
    }
    this.rows = [...this.rows, emptyDraft()];
  }

  removeRow(index: number): void {
    if (this.rows.length === 1) {
      return;
    }
    this.rows = this.rows.filter((_, i) => i !== index);
  }

  applyJson(): void {
    this.error.set(null);
    this.ok.set(null);
    try {
      const parsed = JSON.parse(this.bulkJson) as unknown;
      if (!Array.isArray(parsed) || parsed.length === 0) {
        this.error.set('JSON must be a non-empty array of items.');
        return;
      }
      if (parsed.length > 200) {
        this.error.set('Bulk import allows at most 200 items.');
        return;
      }
      this.rows = parsed.map((entry) => this.toDraft(entry));
      this.ok.set(`Loaded ${this.rows.length} row(s). Review and import.`);
    } catch {
      this.error.set('Invalid JSON');
    }
  }

  async addItem(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    this.ok.set(null);
    try {
      await this.api.createMenuItem(this.id(), this.toPayload(this.item));
      this.item = emptyDraft();
      this.ok.set('Item added.');
    } catch (err) {
      this.error.set(getApiError(err).message);
    } finally {
      this.busy.set(false);
    }
  }

  async addBulk(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    this.ok.set(null);
    try {
      const items = this.rows
        .map((row) => this.toPayload(row))
        .filter((row) => row.name.trim().length > 0);
      if (items.length === 0) {
        this.error.set('Add at least one named item.');
        return;
      }
      await this.api.bulkMenu(this.id(), items);
      await this.router.navigate(['/restaurants', this.id()]);
    } catch (err) {
      this.error.set(getApiError(err).message);
    } finally {
      this.busy.set(false);
    }
  }

  private async loadRestaurant(): Promise<void> {
    try {
      this.restaurant.set(await this.api.getRestaurant(this.id()));
    } catch (err) {
      this.error.set(getApiError(err).message);
    }
  }

  private toDraft(entry: unknown): MenuDraft {
    const row = (entry ?? {}) as Record<string, unknown>;
    return {
      name: typeof row['name'] === 'string' ? row['name'] : '',
      category: typeof row['category'] === 'string' ? row['category'] : '',
      referencePrice:
        typeof row['referencePrice'] === 'string'
          ? row['referencePrice']
          : '0.00',
      isActive: row['isActive'] !== false,
    };
  }

  private toPayload(draft: MenuDraft) {
    return {
      name: draft.name.trim(),
      category: draft.category.trim() || undefined,
      referencePrice: draft.referencePrice.trim(),
      isActive: draft.isActive,
    };
  }
}
