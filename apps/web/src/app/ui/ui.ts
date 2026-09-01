import { Component, input } from '@angular/core';

@Component({
  selector: 'fta-banner',
  template: `
    @if (message()) {
      <div
        class="rounded-[3px] border border-dc-red/40 bg-dc-red/15 px-3 py-2 text-sm text-[#fa777c]"
      >
        {{ message() }}
      </div>
    }
  `,
})
export class Banner {
  readonly message = input<string | null>(null);
}

@Component({
  selector: 'fta-ok',
  template: `
    @if (message()) {
      <div
        class="rounded-[3px] border border-dc-green/40 bg-dc-green/15 px-3 py-2 text-sm text-[#3ba55d]"
      >
        {{ message() }}
      </div>
    }
  `,
})
export class OkBanner {
  readonly message = input<string | null>(null);
}

@Component({
  selector: 'fta-field',
  template: `
    <div class="block">
      <span
        class="mb-1.5 block text-xs font-bold uppercase tracking-wide text-dc-header"
        >{{ label() }}</span
      >
      <ng-content />
    </div>
  `,
})
export class Field {
  readonly label = input.required<string>();
}
