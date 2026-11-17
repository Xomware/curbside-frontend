import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { AccountStore, Identity } from '../../account/account-store';
import { failureMessage } from '../../account/messages';
import { AuthSession } from '../../auth/auth-session';
import { Provider, claims } from '../../auth/cognito';
import { ProviderButton } from '../../ui/provider-button';

const PROVIDERS: Record<Identity['provider'], Provider> = {
  apple: 'SignInWithApple',
  google: 'Google',
};

@Component({
  selector: 'xom-settings',
  imports: [ProviderButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class SettingsPage {
  private readonly auth = inject(AuthSession);
  protected readonly store = inject(AccountStore);

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly status = signal(
    inject(ActivatedRoute).snapshot.queryParamMap.has('linked') ? 'Sign-in added.' : '',
  );

  protected readonly identities = computed(() => this.store.account()?.identities ?? []);
  protected readonly currentSub = computed(() => {
    const id = this.auth.idToken();
    return id ? claims(id)['sub'] : null;
  });
  protected readonly unlinked = computed(() => {
    const linked = new Set(this.identities().map((i) => PROVIDERS[i.provider]));
    return (['SignInWithApple', 'Google'] as Provider[]).filter((p) => !linked.has(p));
  });

  protected label(identity: Identity): string {
    return identity.provider === 'apple' ? 'Apple' : 'Google';
  }

  protected added(identity: Identity): string {
    const date = new Date(identity.created_at);
    return `Added ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }

  protected async link(provider: Provider): Promise<void> {
    this.busy.set(true);
    await this.auth.begin(provider, 'link');
  }

  protected async unlink(identity: Identity): Promise<void> {
    await this.run(async () => {
      await this.store.unlink(identity.sub);
      // This browser's sign-in no longer reaches the account.
      if (identity.sub === this.currentSub()) this.auth.logOut();
      this.status.set(`${this.label(identity)} sign-in removed.`);
    });
  }

  protected async download(): Promise<void> {
    await this.run(async () => {
      const data = await this.store.export();
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
      );
      const a = document.createElement('a');
      a.href = url;
      a.download = `curbside-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      this.status.set('Export downloaded.');
    });
  }

  private async run(action: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    this.status.set('');
    try {
      await action();
    } catch (error) {
      this.error.set(failureMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
