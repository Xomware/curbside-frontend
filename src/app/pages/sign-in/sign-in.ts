import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { DELETED, DeleteResult } from '../../account/account-store';
import { AuthSession } from '../../auth/auth-session';
import { Provider } from '../../auth/cognito';
import { ProviderButton } from '../../ui/provider-button';

@Component({
  selector: 'xom-sign-in',
  imports: [ProviderButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sign-in.html',
  styleUrl: './sign-in.scss',
})
export class SignInPage {
  private readonly auth = inject(AuthSession);
  protected readonly busy = signal(false);
  protected readonly providers: Provider[] = ['SignInWithApple', 'Google'];
  protected readonly deleted = signal(takeDeleted());

  protected async signIn(provider: Provider): Promise<void> {
    this.busy.set(true);
    await this.auth.begin(provider, 'sign-in');
  }
}

function takeDeleted(): DeleteResult | null {
  const raw = sessionStorage.getItem(DELETED);
  sessionStorage.removeItem(DELETED);
  return raw ? (JSON.parse(raw) as DeleteResult) : null;
}
