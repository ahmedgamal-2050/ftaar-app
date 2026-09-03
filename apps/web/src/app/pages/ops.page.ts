import { JsonPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FtaarApi } from '../core/api/ftaar-api';
import { getApiError } from '../core/api/http-error';
import type { HealthPayload } from '../core/api/types';
import { Banner } from '../ui/ui';

@Component({
  selector: 'fta-ops-page',
  imports: [Banner, JsonPipe],
  template: `
    <div class="mx-auto max-w-3xl space-y-4">
      <div class="flex gap-2">
        <button
          class="h-9 rounded-[3px] bg-dc-green px-3 text-sm text-white hover:bg-dc-green-hover"
          (click)="loadLive()"
        >
          GET /health
        </button>
        <button
          class="h-9 rounded-[3px] bg-blurple px-3 text-sm text-white hover:bg-blurple-hover"
          (click)="loadDb()"
        >
          GET /health/db
        </button>
      </div>
      <fta-banner [message]="error()" />
      @if (payload()) {
        <pre
          class="overflow-x-auto rounded-md bg-dc-tertiary p-4 text-xs text-dc-normal"
          >{{ payload() | json }}</pre
        >
      }
    </div>
  `,
})
export class OpsPage {
  private readonly api = inject(FtaarApi);
  readonly payload = signal<HealthPayload | null>(null);
  readonly error = signal<string | null>(null);

  async loadLive(): Promise<void> {
    this.error.set(null);
    try {
      this.payload.set(await this.api.health());
    } catch (err) {
      this.error.set(getApiError(err).message);
    }
  }

  async loadDb(): Promise<void> {
    this.error.set(null);
    try {
      this.payload.set(await this.api.healthDb());
    } catch (err) {
      this.error.set(getApiError(err).message);
    }
  }
}
