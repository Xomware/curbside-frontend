import { ChangeDetectionStrategy, Component, OnInit, effect, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AccountStore } from '../../account/account-store';
import { AuthSession } from '../../auth/auth-session';
import { Loading } from '../../ui/loading';

/** Signed-in frame: loads the account, sends a new sign-in to onboarding and a dead session to sign-in. */
@Component({
  selector: 'xom-shell',
  imports: [Loading, RouterLink, RouterLinkActive, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell implements OnInit {
  private readonly auth = inject(AuthSession);
  private readonly router = inject(Router);
  protected readonly store = inject(AccountStore);

  constructor() {
    effect(() => {
      if (!this.auth.signedIn()) void this.router.navigateByUrl('/sign-in');
      else if (this.store.status() === 'onboarding') void this.router.navigateByUrl('/welcome');
    });
  }

  ngOnInit(): void {
    void this.store.load();
  }
}
