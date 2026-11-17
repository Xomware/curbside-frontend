import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthSession } from './auth-session';

export const signedIn: CanActivateFn = () =>
  inject(AuthSession).signedIn() || inject(Router).parseUrl('/sign-in');

export const signedOut: CanActivateFn = () =>
  !inject(AuthSession).signedIn() || inject(Router).parseUrl('/');
