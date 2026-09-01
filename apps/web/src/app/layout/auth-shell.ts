import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'fta-auth-shell',
  imports: [RouterOutlet, RouterLink],
  template: `
    <div class="flex min-h-full items-center justify-center bg-dc-tertiary">
      <div
        class="m-4 w-full max-w-[480px] rounded-md bg-dc-primary p-8 shadow-[0_8px_16px_rgba(0,0,0,0.24)]"
      >
        <div class="mb-6 text-center">
          <p class="text-2xl font-semibold text-dc-header">Ftaar</p>
          <p class="mt-1 text-sm text-dc-muted">
            Split the bill. Keep the vibe.
          </p>
        </div>
        <router-outlet />
        <p class="mt-6 text-center text-sm text-dc-muted">
          <a routerLink="/welcome" class="text-dc-link hover:underline"
            >Back to welcome</a
          >
        </p>
      </div>
    </div>
  `,
})
export class AuthShell {}
