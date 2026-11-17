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

export interface DeleteResult {
  deleted: true;
  apple_revoke: 'revoked' | 'manual' | 'none';
  manual_revoke_url?: string;
}

/** Carries the delete result to the sign-in page across the sign-out. */
export const DELETED = 'curbside.deleted';

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

  async unlink(sub: string): Promise<void> {
    this.account.set(
      await this.api.request<Account>('DELETE', `/me/identities/${encodeURIComponent(sub)}`),
    );
  }

  /** Everything the account holds, as the API returns it. */
  export(): Promise<unknown> {
    return this.api.request<unknown>('GET', '/me/export');
  }

  /** 403 `reauth_required` unless the session signed in within 10 minutes, with Apple if Apple is linked. */
  remove(): Promise<DeleteResult> {
    return this.api.request<DeleteResult>('DELETE', '/me');
  }

  /** Adds the sign-in behind `idToken` to the account the current session belongs to. */
  async link(idToken: string): Promise<void> {
    await this.api.request('POST', '/me/identities', { id_token: idToken });
  }
}
