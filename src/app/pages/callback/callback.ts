import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AccountStore } from '../../account/account-store';
import { failureMessage } from '../../account/messages';
import { ApiError } from '../../api/api';
import { AuthSession, Pending } from '../../auth/auth-session';
import { Tokens, providerOf } from '../../auth/cognito';

/** Lands the Cognito redirect: exchanges the code, then does what the sign-in was started for. */
@Component({
  selector: 'xom-callback',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="page">
      <h1 class="sign">Curbside</h1>
      @if (error(); as message) {
        <p class="notice" role="alert">{{ message }}</p>
        <a class="btn" [routerLink]="auth.signedIn() ? '/' : '/sign-in'">Back</a>
      } @else {
        <p class="muted" role="status">Signing you in…</p>
      }
    </main>
  `,
})
export class CallbackPage implements OnInit {
  protected readonly auth = inject(AuthSession);
  private readonly account = inject(AccountStore);
  private readonly router = inject(Router);
  protected readonly error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      const { pending, tokens } = await this.auth.complete(new URLSearchParams(location.search));
      await this.land(pending, tokens);
    } catch (error) {
      this.error.set(failureMessage(error));
    }
  }

  private async land(pending: Pending, tokens: Tokens): Promise<void> {
    if (pending.intent === 'link') {
      await this.account.link(tokens.id);
      await this.router.navigateByUrl('/settings?linked=1', { replaceUrl: true });
      return;
    }
    this.auth.adopt(tokens);
    if (pending.intent === 'reauth') {
      await this.router.navigateByUrl('/settings?delete=confirm', { replaceUrl: true });
      return;
    }
    if (pending.linkIdToken && !(await this.linkOrphan(pending.linkIdToken))) return;
    await this.router.navigateByUrl('/', { replaceUrl: true });
  }

  /**
   * Onboarding's link path: the session is now the existing account, and `idToken` is the sign-in to add.
   * False when it had to leave the page for a fresh sign-in.
   */
  private async linkOrphan(idToken: string): Promise<boolean> {
    try {
      await this.account.link(idToken);
    } catch (error) {
      if (
        !(error instanceof ApiError) ||
        !['already_linked', 'invalid_id_token'].includes(error.code ?? '')
      ) {
        throw error;
      }
      // Older than the server's 10 minutes: get a fresh one for the same sign-in.
      if (error.code === 'invalid_id_token') {
        await this.auth.begin(providerOf(idToken), 'link');
        return false;
      }
    }
    return true;
  }
}
