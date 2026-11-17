import { environment } from '../../environments/environment';

export type Provider = 'SignInWithApple' | 'Google';

export interface Tokens {
  access: string;
  id: string;
  refresh: string;
}

/** Cognito said no: a bad state, a denied sign-in, or a refresh token that is revoked or expired. */
export class AuthError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

export function redirectUri(): string {
  return `${location.origin}/auth/callback`;
}

export function authorizeUrl(provider: Provider, challenge: string, state: string): string {
  const query = new URLSearchParams({
    response_type: 'code',
    client_id: environment.cognitoClientId,
    redirect_uri: redirectUri(),
    identity_provider: provider,
    scope: 'openid',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });
  return `${environment.cognitoDomain}/oauth2/authorize?${query}`;
}

/** `keepRefresh` fills in the refresh token, which Cognito leaves out of refresh-grant responses. */
export async function exchange(
  form: Record<string, string>,
  keepRefresh?: string,
): Promise<Tokens> {
  const response = await fetch(`${environment.cognitoDomain}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...form, client_id: environment.cognitoClientId }),
  });
  // An outage is not a rejection: a plain Error keeps the session instead of signing out.
  if (response.status >= 500) throw new Error(`Cognito token endpoint ${response.status}`);
  const body = (await response.json()) as Record<string, string | undefined>;
  if (!response.ok) throw new AuthError(body['error'] ?? 'rejected');

  const refresh = body['refresh_token'] ?? keepRefresh;
  if (!body['access_token'] || !body['id_token'] || !refresh) throw new AuthError('malformed');
  return { access: body['access_token'], id: body['id_token'], refresh };
}

/** Clears Cognito's own session cookie, so the next sign-in asks again. The logout URI is the bare origin. */
export function logoutUrl(): string {
  const query = new URLSearchParams({
    client_id: environment.cognitoClientId,
    logout_uri: location.origin,
  });
  return `${environment.cognitoDomain}/logout?${query}`;
}

export async function revoke(refresh: string): Promise<void> {
  await fetch(`${environment.cognitoDomain}/oauth2/revoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token: refresh, client_id: environment.cognitoClientId }),
  });
}

/** The JWT payload, unverified. Only for display and routing hints; the API verifies for real. */
export function claims(jwt: string): Record<string, unknown> {
  const payload = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(payload)) as Record<string, unknown>;
}

/** Cognito usernames for federated users are `<provider>_<id>`, e.g. `google_1234`. */
export function providerOf(idToken: string): Provider {
  const username = String(claims(idToken)['cognito:username'] ?? '');
  return username.toLowerCase().startsWith('signinwithapple_') ? 'SignInWithApple' : 'Google';
}
