import { Injectable, inject, signal } from '@angular/core';

import { Api, ApiError } from '../api/api';

export interface Identity {
  sub: string;
  provider: 'apple' | 'google';
  created_at: string;
}

export interface Account {
  account_id: string;
  display_name: string;
  created_at: string;
  identities: Identity[];
}

export type AccountStatus = 'loading' | 'ready' | 'onboarding' | 'failed';

@Injectable({ providedIn: 'root' })
export class AccountStore {
  private readonly api = inject(Api);

  readonly account = signal<Account | null>(null);
  readonly status = signal<AccountStatus>('loading');

  async load(): Promise<void> {
    this.status.set('loading');
    try {
      this.account.set(await this.api.request<Account>('GET', '/me'));
      this.status.set('ready');
    } catch (error) {
      this.account.set(null);
      this.status.set(
        error instanceof ApiError && error.code === 'needs_onboarding' ? 'onboarding' : 'failed',
      );
    }
  }

  async create(displayName: string): Promise<void> {
    this.account.set(await this.api.request<Account>('POST', '/me', { display_name: displayName }));
    this.status.set('ready');
  }

  /** Adds the sign-in behind `idToken` to the account the current session belongs to. */
  async link(idToken: string): Promise<void> {
    await this.api.request('POST', '/me/identities', { id_token: idToken });
  }
}
