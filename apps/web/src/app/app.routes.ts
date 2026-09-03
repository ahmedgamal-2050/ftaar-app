import { Route } from '@angular/router';
import { anonymousGuard, authGuard } from './core/session/auth.guard';
import { AuthShell } from './layout/auth-shell';
import { Shell } from './layout/shell';
import { ConvertPage } from './pages/convert.page';
import { ForgotPage } from './pages/forgot.page';
import { HomePage } from './pages/home.page';
import { LobbiesPage } from './pages/lobbies.page';
import { LobbyDetailPage } from './pages/lobby-detail.page';
import { LobbyLookupPage } from './pages/lobby-lookup.page';
import { LobbyOrdersPage } from './pages/lobby-orders.page';
import { LoginPage } from './pages/login.page';
import { OpsPage } from './pages/ops.page';
import { ProfilePage } from './pages/profile.page';
import { RegisterPage } from './pages/register.page';
import { ResetPage } from './pages/reset.page';
import { MenuFormPage } from './pages/menu-form.page';
import { RestaurantDetailPage } from './pages/restaurant-detail.page';
import { RestaurantsPage } from './pages/restaurants.page';
import { VerifyOtpPage } from './pages/verify-otp.page';
import { WelcomePage } from './pages/welcome.page';

export const appRoutes: Route[] = [
  {
    path: '',
    component: AuthShell,
    canActivate: [anonymousGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'welcome' },
      { path: 'welcome', component: WelcomePage },
      { path: 'login', component: LoginPage },
      { path: 'register', component: RegisterPage },
      { path: 'verify-otp', component: VerifyOtpPage },
      { path: 'forgot', component: ForgotPage },
      { path: 'reset', component: ResetPage },
    ],
  },
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    children: [
      { path: 'home', component: HomePage },
      { path: 'ops', component: OpsPage },
      { path: 'restaurants', component: RestaurantsPage },
      { path: 'restaurants/:id/menu', component: MenuFormPage },
      { path: 'restaurants/:id', component: RestaurantDetailPage },
      { path: 'lobbies', component: LobbiesPage },
      { path: 'lobbies/lookup', component: LobbyLookupPage },
      { path: 'lobbies/:id', component: LobbyDetailPage },
      { path: 'lobbies/:id/orders', component: LobbyOrdersPage },
      { path: 'account', component: ProfilePage },
      { path: 'account/convert', component: ConvertPage },
    ],
  },
  { path: '**', redirectTo: 'welcome' },
];
