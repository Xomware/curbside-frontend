import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { AccountStore, DELETED, Identity } from '../../account/account-store';
import { failureMessage } from '../../account/messages';
import { ApiError } from '../../api/api';
import { AuthSession } from '../../auth/auth-session';
import { Provider, claims, providerOf } from '../../auth/cognito';
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
  private readonly query = inject(ActivatedRoute).snapshot.queryParamMap;
  protected readonly store = inject(AccountStore);

  /** `confirm` also follows the re-auth round trip, so nothing is deleted without a click after it. */
  protected readonly deleteStep = signal<'idle' | 'confirm' | 'reauth'>(
    this.query.get('delete') === 'confirm' ? 'confirm' : 'idle',
  );
  private readonly deleteHeading = viewChild<ElementRef<HTMLElement>>('deleteHeading');

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly status = signal(this.query.has('linked') ? 'Sign-in added.' : '');

  constructor() {
    effect(() => {
      if (this.deleteStep() !== 'idle') this.deleteHeading()?.nativeElement.focus();
    });
  }

  protected readonly identities = computed(() => this.store.account()?.identities ?? []);
  protected readonly currentSub = computed(() => {
    const id = this.auth.idToken();
    return id ? claims(id)['sub'] : null;
  });
  protected readonly unlinked = computed(() => {
    const linked = new Set(this.identities().map((i) => PROVIDERS[i.provider]));
    return (['SignInWithApple', 'Google'] as Provider[]).filter((p) => !linked.has(p));
  });

  /** The server wants Apple whenever an Apple sign-in is linked, else any fresh sign-in. */
  protected readonly reauthProvider = computed<Provider>(() => {
    if (this.identities().some((i) => i.provider === 'apple')) return 'SignInWithApple';
    const id = this.auth.idToken();
    return id ? providerOf(id) : 'Google';
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

  protected async reauth(): Promise<void> {
    this.busy.set(true);
    await this.auth.begin(this.reauthProvider(), 'reauth');
  }

  protected async remove(): Promise<void> {
    await this.run(async () => {
      try {
        sessionStorage.setItem(DELETED, JSON.stringify(await this.store.remove()));
      } catch (error) {
        if (!(error instanceof ApiError) || error.code !== 'reauth_required') throw error;
        this.deleteStep.set('reauth');
        return;
      }
      // Local sign-out, not logOut(): the Cognito logout reloads the app and would wipe the one-time notice
      // the shell's redirect to /sign-in shows. The Cognito users are deleted, so their cookie is inert.
      this.auth.signOut();
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
