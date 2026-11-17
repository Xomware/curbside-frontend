import { Injectable, InjectionToken, computed, inject, signal } from '@angular/core';

import {
  AuthError,
  Provider,
  Tokens,
  authorizeUrl,
  exchange,
  logoutUrl,
  redirectUri,
  revoke,
} from './cognito';
import { challenge, randomToken } from './pkce';

/**
 * What the callback does with the new tokens. `sign-in` and `reauth` replace the session;
 * `link` keeps it and spends the new ID token on POST /me/identities.
 */
export type Intent = 'sign-in' | 'link' | 'reauth';

/** Survives the redirect to Cognito and back. */
export interface Pending {
  state: string;
  verifier: string;
  provider: Provider;
  intent: Intent;
  /** Onboarding's link path: the orphan sign-in's ID token, posted once the other sign-in is back. */
  linkIdToken?: string;
}

/** Full-page navigation, swappable in tests. */
export const REDIRECT = new InjectionToken<(url: string) => void>('REDIRECT', {
  factory: () => (url) => location.assign(url),
});

// sessionStorage, not localStorage: the session survives reloads and the PKCE redirects but dies with the tab,
// so a refresh token never sits on disk for a month (web-foundation PLAN.md, "Refresh token storage").
const TOKENS = 'curbside.tokens';
const PENDING = 'curbside.pending';

@Injectable({ providedIn: 'root' })
export class AuthSession {
  private readonly redirect = inject(REDIRECT);
  private readonly tokens = signal<Tokens | null>(read<Tokens>(TOKENS));
  private refreshing: Promise<string> | null = null;

  readonly signedIn = computed(() => this.tokens() !== null);
  readonly idToken = computed(() => this.tokens()?.id ?? null);

  accessToken(): string | null {
    return this.tokens()?.access ?? null;
  }

  async begin(provider: Provider, intent: Intent, linkIdToken?: string): Promise<void> {
    const pending: Pending = {
      state: randomToken(),
      verifier: randomToken(),
      provider,
      intent,
      linkIdToken,
    };
    sessionStorage.setItem(PENDING, JSON.stringify(pending));
    this.redirect(authorizeUrl(provider, await challenge(pending.verifier), pending.state));
  }

  /** Turns the callback query into tokens. State is checked first so a forged callback gets no further. */
  async complete(query: URLSearchParams): Promise<{ pending: Pending; tokens: Tokens }> {
    const pending = read<Pending>(PENDING);
    sessionStorage.removeItem(PENDING);
    if (!pending || query.get('state') !== pending.state) throw new AuthError('state_mismatch');
    const denied = query.get('error');
    if (denied) throw new AuthError(denied);
    const code = query.get('code');
    if (!code) throw new AuthError('missing_code');

    const tokens = await exchange({
      grant_type: 'authorization_code',
      code,
      code_verifier: pending.verifier,
      redirect_uri: redirectUri(),
    });
    return { pending, tokens };
  }

  adopt(tokens: Tokens): void {
    sessionStorage.setItem(TOKENS, JSON.stringify(tokens));
    this.tokens.set(tokens);
  }

  /** Concurrent 401s share one refresh. A rejected refresh token signs out; an outage keeps the session. */
  refresh(): Promise<string> {
    this.refreshing ??= this.runRefresh().finally(() => (this.refreshing = null));
    return this.refreshing;
  }

  signOut(): void {
    const refresh = this.tokens()?.refresh;
    this.tokens.set(null);
    sessionStorage.removeItem(TOKENS);
    // Best effort: the local session is gone either way, and a failed revoke leaves a token that expires on its own.
    if (refresh) revoke(refresh).catch(() => undefined);
  }

  /** The user's sign-out: also ends the Cognito session, which redirects back to the origin. */
  logOut(): void {
    this.signOut();
    this.redirect(logoutUrl());
  }

  private async runRefresh(): Promise<string> {
    const refresh = this.tokens()?.refresh;
    if (!refresh) throw new AuthError('signed_out');
    let fresh: Tokens;
    try {
      fresh = await exchange({ grant_type: 'refresh_token', refresh_token: refresh }, refresh);
    } catch (error) {
      if (error instanceof AuthError) this.signOut();
      throw error;
    }
    // A sign-out while the request was in flight wins; don't resurrect the session.
    if (this.tokens()?.refresh !== refresh) throw new AuthError('signed_out');
    this.adopt(fresh);
    return fresh.access;
  }
}

function read<T>(key: string): T | null {
  const raw = sessionStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : null;
}
