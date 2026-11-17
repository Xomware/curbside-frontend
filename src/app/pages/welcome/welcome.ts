import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AccountStore } from '../../account/account-store';
import { failureMessage } from '../../account/messages';
import { AuthSession } from '../../auth/auth-session';
import { Provider } from '../../auth/cognito';
import { ProviderButton } from '../../ui/provider-button';

/** First sign-in with no account: start a new one, or attach this sign-in to the account you already have. */
@Component({
  selector: 'xom-welcome',
  imports: [ReactiveFormsModule, ProviderButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './welcome.html',
  styleUrl: './welcome.scss',
})
export class WelcomePage {
  private readonly auth = inject(AuthSession);
  private readonly account = inject(AccountStore);
  private readonly router = inject(Router);

  protected readonly providers: Provider[] = ['SignInWithApple', 'Google'];
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  // The API takes 1-80 characters after trimming.
  protected readonly name = inject(NonNullableFormBuilder).control('', [
    Validators.required,
    Validators.maxLength(80),
    Validators.pattern(/\S/),
  ]);

  protected async create(): Promise<void> {
    if (this.name.invalid) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.account.create(this.name.value.trim());
      await this.router.navigateByUrl('/');
    } catch (error) {
      this.error.set(failureMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  protected async link(provider: Provider): Promise<void> {
    this.busy.set(true);
    await this.auth.begin(provider, 'sign-in', this.auth.idToken() ?? undefined);
  }

  protected useAnother(): void {
    this.auth.logOut();
  }
}
