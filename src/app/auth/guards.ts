import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router } from '@angular/router';

import { AccountStore } from '../account/account-store';
import { AuthSession } from './auth-session';

export const signedIn: CanActivateFn = () =>
  inject(AuthSession).signedIn() || inject(Router).parseUrl('/sign-in');

export const signedOut: CanActivateFn = () =>
  !inject(AuthSession).signedIn() || inject(Router).parseUrl('/');

/** `/` is the landing page until someone signs in; after that the same URL falls through to the map. */
export const signedOutMatch: CanMatchFn = () => !inject(AuthSession).signedIn();

/** `/admin` is for accounts with `is_admin` on GET /me; the API enforces it too. */
export const admin: CanActivateFn = async () => {
  const store = inject(AccountStore);
  const router = inject(Router);
  if (store.status() !== 'ready') await store.load();
  return store.account()?.is_admin === true || router.parseUrl('/');
};
