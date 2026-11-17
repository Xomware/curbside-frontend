import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

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

  protected async signIn(provider: Provider): Promise<void> {
    this.busy.set(true);
    await this.auth.begin(provider, 'sign-in');
  }
}
