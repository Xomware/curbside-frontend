import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { AuthSession } from '../../auth/auth-session';
import { Provider } from '../../auth/cognito';
import { ProviderButton } from '../../ui/provider-button';

@Component({
  selector: 'xom-sign-in-buttons',
  imports: [ProviderButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (provider of providers; track provider) {
      <button [xomProvider]="provider" [disabled]="busy()" (click)="signIn(provider)"></button>
    }
  `,
  styles: `
    :host {
      display: grid;
      gap: 12px;
      width: min(100%, 380px);
    }
  `,
})
export class SignInButtons {
  private readonly auth = inject(AuthSession);
  protected readonly busy = signal(false);
  protected readonly providers: Provider[] = ['SignInWithApple', 'Google'];

  protected async signIn(provider: Provider): Promise<void> {
    this.busy.set(true);
    await this.auth.begin(provider, 'sign-in');
  }
}
