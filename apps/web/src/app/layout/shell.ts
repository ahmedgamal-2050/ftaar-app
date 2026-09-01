import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { SessionService } from '../core/session/session.service';

interface Channel {
  label: string;
  path: string;
}

@Component({
  selector: 'fta-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.html',
})
export class Shell {
  private readonly router = inject(Router);
  readonly session = inject(SessionService);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  readonly guild = computed(() => {
    const path = this.url();
    if (path.startsWith('/restaurants')) {
      return 'catalog';
    }
    if (path.startsWith('/lobbies')) {
      return 'lobbies';
    }
    if (path.startsWith('/account')) {
      return 'account';
    }
    if (path.startsWith('/ops')) {
      return 'ops';
    }
    return 'home';
  });

  readonly heading = computed(() => {
    switch (this.guild()) {
      case 'catalog':
        return 'Catalog';
      case 'lobbies':
        return 'Lobbies';
      case 'account':
        return 'Account';
      case 'ops':
        return 'Ops';
      default:
        return 'Ftaar';
    }
  });

  readonly channels = computed<Channel[]>(() => {
    switch (this.guild()) {
      case 'catalog':
        return [{ label: 'restaurants', path: '/restaurants' }];
      case 'lobbies':
        return [
          { label: 'create-join', path: '/lobbies' },
          { label: 'lookup', path: '/lobbies/lookup' },
        ];
      case 'account':
        return [
          { label: 'profile', path: '/account' },
          { label: 'convert', path: '/account/convert' },
        ];
      case 'ops':
        return [{ label: 'health', path: '/ops' }];
      default:
        return [{ label: 'welcome', path: '/home' }];
    }
  });

  initials(): string {
    const name = this.session.user()?.displayName ?? 'G';
    return name.slice(0, 1).toUpperCase();
  }
}
