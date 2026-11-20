import { Routes } from '@angular/router';

import { signedIn, signedOut, signedOutMatch } from './auth/guards';
import { CallbackPage } from './pages/callback/callback';
import { CapturePage } from './pages/capture/capture-page';
import { HouseholdPage } from './pages/household/household-page';
import { InvitePage } from './pages/invite/invite';
import { LandingPage } from './pages/landing/landing';
import { MapPage } from './pages/map/map-page';
import { ProfilePage } from './pages/profile/profile';
import { PrivacyPage } from './pages/privacy/privacy';
import { SettingsPage } from './pages/settings/settings';
import { Shell } from './pages/shell/shell';
import { SignInPage } from './pages/sign-in/sign-in';
import { WelcomePage } from './pages/welcome/welcome';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: LandingPage,
    canMatch: [signedOutMatch],
    title: 'Curbside',
  },
  { path: 'sign-in', component: SignInPage, canActivate: [signedOut], title: 'Sign in · Curbside' },
  { path: 'auth/callback', component: CallbackPage, title: 'Signing in · Curbside' },
  { path: 'invite/:code', component: InvitePage, title: 'Invite · Curbside' },
  { path: 'privacy', component: PrivacyPage, title: 'Privacy · Curbside' },
  { path: 'welcome', component: WelcomePage, canActivate: [signedIn], title: 'Welcome · Curbside' },
  {
    path: '',
    component: Shell,
    canActivate: [signedIn],
    children: [
      { path: '', component: MapPage, title: 'Curbside' },
      { path: 'households/:id', component: HouseholdPage, title: 'Household · Curbside' },
      { path: 'capture', component: CapturePage, title: 'Talk · Curbside' },
      { path: 'profile', component: ProfilePage, title: 'Profile · Curbside' },
      { path: 'settings', component: SettingsPage, title: 'Settings · Curbside' },
    ],
  },
  { path: '**', redirectTo: '' },
];
