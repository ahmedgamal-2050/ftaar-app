import { JsonPipe } from '@angular/common';
import { Component, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FtaarApi } from '../core/api/ftaar-api';
import { getApiError } from '../core/api/http-error';
import type { BillDraft, BillPreview, Lobby } from '../core/api/types';
import { SessionService } from '../core/session/session.service';
import { Banner, Field } from '../ui/ui';

@Component({
  selector: 'fta-lobby-detail-page',
  imports: [FormsModule, Banner, Field, JsonPipe, RouterLink],
  template: `
    <div class="mx-auto max-w-5xl space-y-4">
      <fta-banner [message]="error()" />
      @if (lobby(); as room) {
        <div class="rounded-md bg-dc-secondary p-4">
          <div class="flex flex-wrap items-center gap-3">
            <h2 class="text-xl font-semibold text-dc-header">
              {{ room.code }}
            </h2>
            <span
              class="rounded-full bg-dc-tertiary px-2 py-0.5 text-xs uppercase text-dc-muted"
              >{{ room.status }}</span
            >
            <span class="text-sm text-dc-muted">{{
              room.restaurant?.name
            }}</span>
          </div>
          <p class="mt-1 text-xs text-dc-muted">{{ room.id }}</p>
          <div class="mt-3 flex flex-wrap gap-2">
            <a
              [routerLink]="['/lobbies', room.id, 'orders']"
              class="flex h-9 items-center rounded-[3px] bg-dc-green px-3 text-sm text-white"
            >
              Orders
            </a>
            <button
              class="h-9 rounded-[3px] bg-blurple px-3 text-sm text-white"
              (click)="lock()"
            >
              Lock
            </button>
            <button
              class="h-9 rounded-[3px] bg-dc-modifier px-3 text-sm text-white"
              (click)="reopenLobby()"
            >
              Reopen lobby
            </button>
            <button
              class="h-9 rounded-[3px] bg-dc-red px-3 text-sm text-white"
              (click)="leave()"
            >
              Leave
            </button>
          </div>
        </div>

        <div class="grid gap-4 lg:grid-cols-[1fr_240px]">
          <div class="space-y-4">
            <div class="rounded-md bg-dc-secondary p-4">
              <h3 class="mb-3 font-semibold text-dc-header">Billing</h3>
              <div class="mb-3 flex flex-wrap gap-2">
                <button
                  class="h-8 rounded-[3px] bg-dc-hover px-3 text-xs text-white"
                  (click)="loadDraft()"
                >
                  GET draft
                </button>
                <button
                  class="h-8 rounded-[3px] bg-dc-hover px-3 text-xs text-white"
                  (click)="loadBill()"
                >
                  GET bill
                </button>
                <button
                  class="h-8 rounded-[3px] bg-dc-hover px-3 text-xs text-white"
                  (click)="preview()"
                >
                  Preview
                </button>
                <button
                  class="h-8 rounded-[3px] bg-dc-green px-3 text-xs text-white"
                  (click)="finalise()"
                >
                  Finalise
                </button>
                <button
                  class="h-8 rounded-[3px] bg-dc-red px-3 text-xs text-white"
                  (click)="reopenBill()"
                >
                  Reopen bill
                </button>
              </div>
              <div class="grid gap-4 md:grid-cols-4">
                <fta-field label="Delivery">
                  <input
                    class="h-9 w-full rounded-[3px] bg-dc-input px-2 text-sm outline-none"
                    name="delivery"
                    placeholder="15.00"
                    [(ngModel)]="deliveryFee"
                  />
                </fta-field>
                <fta-field label="Service">
                  <input
                    class="h-9 w-full rounded-[3px] bg-dc-input px-2 text-sm outline-none"
                    name="service"
                    placeholder="5.00"
                    [(ngModel)]="serviceFee"
                  />
                </fta-field>
                <fta-field label="Discount">
                  <input
                    class="h-9 w-full rounded-[3px] bg-dc-input px-2 text-sm outline-none"
                    name="discount"
                    placeholder="0.00"
                    [(ngModel)]="discount"
                  />
                </fta-field>
                <fta-field label="Receipt total">
                  <input
                    class="h-9 w-full rounded-[3px] bg-dc-input px-2 text-sm outline-none"
                    name="receipt"
                    placeholder="Optional total"
                    [(ngModel)]="receiptTotal"
                  />
                </fta-field>
              </div>
              <fta-field class="mt-4" label="Idempotency key">
                <input
                  class="h-9 w-full rounded-[3px] bg-dc-input px-2 text-sm outline-none"
                  name="idem"
                  placeholder="Unique key for finalise"
                  [(ngModel)]="idempotencyKey"
                />
              </fta-field>
              <label class="mt-2 block text-xs text-dc-muted">
                <input
                  type="checkbox"
                  name="applyAll"
                  [(ngModel)]="applyToAllMatching"
                />
                applyToAllMatching on line patches
              </label>
            </div>

            @if (draft(); as bill) {
              <div class="space-y-3">
                @for (group of bill.groups; track group.menuItemId) {
                  <div class="rounded-md bg-dc-secondary p-3">
                    <p class="text-sm font-semibold text-dc-header">
                      {{ group.name }}
                      <span class="font-normal text-dc-muted"
                        >ref {{ group.referencePrice }}</span
                      >
                    </p>
                    @for (line of group.lines; track line.id) {
                      <div class="mt-3 flex flex-wrap items-end gap-4">
                        <span class="pb-2 text-xs text-dc-muted">{{
                          line.id
                        }}</span>
                        <fta-field label="Actual price">
                          <input
                            class="h-8 w-28 rounded-[3px] bg-dc-input px-2 text-sm outline-none"
                            [name]="'price' + line.id"
                            placeholder="0.00"
                            [ngModel]="line.actualPrice ?? line.suggestedActual"
                            (ngModelChange)="line.actualPrice = $event"
                          />
                        </fta-field>
                        <label class="text-xs text-dc-muted">
                          <input
                            type="checkbox"
                            [name]="'delivered' + line.id"
                            [ngModel]="line.delivered"
                            (ngModelChange)="line.delivered = $event"
                          />
                          delivered
                        </label>
                        <button
                          class="text-xs text-dc-link"
                          (click)="
                            saveLine(line.id, line.actualPrice, line.delivered)
                          "
                        >
                          PATCH line
                        </button>
                      </div>
                    }
                  </div>
                }
              </div>
            }

            @if (previewData()) {
              <pre
                class="overflow-x-auto rounded-md bg-dc-tertiary p-3 text-xs"
                >{{ previewData() | json }}</pre
              >
            }
          </div>

          <aside class="rounded-md bg-dc-secondary p-3">
            <p
              class="mb-2 text-[11px] font-semibold uppercase tracking-wide text-dc-muted"
            >
              Members — {{ room.members.length }}
            </p>
            @for (member of room.members; track member.id) {
              <div class="mb-2 flex items-center gap-2">
                <div
                  class="flex h-8 w-8 items-center justify-center rounded-full bg-blurple text-xs font-bold text-white"
                >
                  {{ member.displayName.slice(0, 1) }}
                </div>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm text-dc-header">
                    {{ member.displayName }}
                  </p>
                  <p class="text-[11px] text-dc-muted">{{ member.role }}</p>
                </div>
                @if (member.role !== 'admin') {
                  <button class="text-xs text-dc-red" (click)="kick(member.id)">
                    Kick
                  </button>
                }
              </div>
            }
          </aside>
        </div>
      }
    </div>
  `,
})
export class LobbyDetailPage implements OnInit {
  readonly id = input.required<string>();
  private readonly api = inject(FtaarApi);
  private readonly router = inject(Router);
  readonly session = inject(SessionService);
  readonly lobby = signal<Lobby | null>(null);
  readonly draft = signal<BillDraft | null>(null);
  readonly previewData = signal<BillPreview | unknown | null>(null);
  readonly error = signal<string | null>(null);
  deliveryFee = '15.00';
  serviceFee = '5.00';
  discount = '0';
  receiptTotal = '';
  idempotencyKey = '';
  applyToAllMatching = false;

  ngOnInit(): void {
    void this.reload();
  }

  fees() {
    return {
      deliveryFee: this.deliveryFee,
      serviceFee: this.serviceFee,
      discount: this.discount,
      receiptTotal: this.receiptTotal || undefined,
    };
  }

  async reload(): Promise<void> {
    this.error.set(null);
    try {
      this.lobby.set(await this.api.getLobby(this.id()));
    } catch (err) {
      this.error.set(getApiError(err).message);
    }
  }

  async lock(): Promise<void> {
    try {
      this.lobby.set(await this.api.lockLobby(this.id()));
    } catch (err) {
      this.error.set(getApiError(err).message);
    }
  }

  async reopenLobby(): Promise<void> {
    try {
      this.lobby.set(await this.api.reopenLobby(this.id()));
    } catch (err) {
      this.error.set(getApiError(err).message);
    }
  }

  async leave(): Promise<void> {
    try {
      await this.api.leaveLobby(this.id());
      await this.router.navigateByUrl('/lobbies');
    } catch (err) {
      this.error.set(getApiError(err).message);
    }
  }

  async kick(memberId: string): Promise<void> {
    try {
      await this.api.removeMember(this.id(), memberId);
      await this.reload();
    } catch (err) {
      this.error.set(getApiError(err).message);
    }
  }

  async loadDraft(): Promise<void> {
    try {
      this.draft.set(await this.api.billDraft(this.id()));
    } catch (err) {
      this.error.set(getApiError(err).message);
    }
  }

  async saveLine(
    lineId: string,
    actualPrice: string | null | undefined,
    delivered: boolean,
  ): Promise<void> {
    try {
      this.draft.set(
        await this.api.patchBillLines(this.id(), {
          applyToAllMatching: this.applyToAllMatching,
          lines: [{ id: lineId, actualPrice, delivered }],
        }),
      );
    } catch (err) {
      this.error.set(getApiError(err).message);
    }
  }

  async preview(): Promise<void> {
    try {
      this.previewData.set(await this.api.previewBill(this.id(), this.fees()));
    } catch (err) {
      this.error.set(getApiError(err).message);
    }
  }

  async finalise(): Promise<void> {
    try {
      this.previewData.set(
        await this.api.finaliseBill(
          this.id(),
          {
            ...this.fees(),
            idempotencyKey: this.idempotencyKey || undefined,
          },
          this.idempotencyKey || undefined,
        ),
      );
      await this.reload();
    } catch (err) {
      this.error.set(getApiError(err).message);
    }
  }

  async reopenBill(): Promise<void> {
    try {
      this.previewData.set(await this.api.reopenBill(this.id()));
      await this.reload();
    } catch (err) {
      this.error.set(getApiError(err).message);
    }
  }

  async loadBill(): Promise<void> {
    try {
      this.previewData.set(await this.api.getBill(this.id()));
    } catch (err) {
      this.error.set(getApiError(err).message);
    }
  }
}
