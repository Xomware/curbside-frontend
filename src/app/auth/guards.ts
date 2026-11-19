import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router } from '@angular/router';

import { AuthSession } from './auth-session';

export const signedIn: CanActivateFn = () =>
  inject(AuthSession).signedIn() || inject(Router).parseUrl('/sign-in');

export const signedOut: CanActivateFn = () =>
  !inject(AuthSession).signedIn() || inject(Router).parseUrl('/');

/** `/` is the landing page until someone signs in; after that the same URL falls through to the map. */
export const signedOutMatch: CanMatchFn = () => !inject(AuthSession).signedIn();
