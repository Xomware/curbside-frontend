import { Routes } from '@angular/router';

import { signedIn, signedOut } from './auth/guards';
import { CallbackPage } from './pages/callback/callback';
import { HomePage } from './pages/home/home';
import { Shell } from './pages/shell/shell';
import { SignInPage } from './pages/sign-in/sign-in';
import { WelcomePage } from './pages/welcome/welcome';

export const routes: Routes = [
  { path: 'sign-in', component: SignInPage, canActivate: [signedOut], title: 'Sign in · Curbside' },
  { path: 'auth/callback', component: CallbackPage, title: 'Signing in · Curbside' },
  { path: 'welcome', component: WelcomePage, canActivate: [signedIn], title: 'Welcome · Curbside' },
  {
    path: '',
    component: Shell,
    canActivate: [signedIn],
    children: [{ path: '', component: HomePage, title: 'Curbside' }],
  },
  { path: '**', redirectTo: '' },
];
