import { TestBed } from '@angular/core/testing';

import { fakeTokens, json } from '../../testing/fakes';
import { AuthSession, REDIRECT } from './auth-session';
import { AuthError } from './cognito';

describe('AuthSession', () => {
  let redirects: string[];
  let fetchMock: ReturnType<typeof vi.fn>;

  function session(): AuthSession {
    TestBed.configureTestingModule({
      providers: [{ provide: REDIRECT, useValue: (url: string) => redirects.push(url) }],
    });
    return TestBed.inject(AuthSession);
  }

  beforeEach(() => {
    sessionStorage.clear();
    redirects = [];
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('redirects to Cognito and exchanges the code that comes back with the same state', async () => {
    const auth = session();
    await auth.begin('Google', 'sign-in');
    const state = new URL(redirects[0]).searchParams.get('state') ?? '';
    fetchMock.mockResolvedValue(
      json(200, { access_token: 'a', id_token: 'i', refresh_token: 'r' }),
    );

    const { pending, tokens } = await auth.complete(new URLSearchParams({ state, code: 'c' }));

    expect(pending.intent).toBe('sign-in');
    expect(tokens).toEqual({ access: 'a', id: 'i', refresh: 'r' });
    const form = new URLSearchParams(fetchMock.mock.calls[0][1].body as URLSearchParams);
    expect(form.get('code')).toBe('c');
    expect(form.get('code_verifier')).toBe(pending.verifier);
  });

  it('rejects a callback whose state does not match, without calling Cognito', async () => {
    const auth = session();
    await auth.begin('Google', 'sign-in');

    await expect(
      auth.complete(new URLSearchParams({ state: 'forged', code: 'c' })),
    ).rejects.toEqual(new AuthError('state_mismatch'));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps an adopted session across a reload', () => {
    session().adopt(fakeTokens());
    TestBed.resetTestingModule();

    expect(session().signedIn()).toBe(true);
  });

  it('shares one refresh between concurrent callers', async () => {
    const auth = session();
    auth.adopt(fakeTokens());
    fetchMock.mockResolvedValue(json(200, { access_token: 'new', id_token: 'i' }));

    expect(await Promise.all([auth.refresh(), auth.refresh()])).toEqual(['new', 'new']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('signs out when Cognito rejects the refresh token, and stays signed in on an outage', async () => {
    const auth = session();
    auth.adopt(fakeTokens());
    fetchMock.mockResolvedValue(json(503, {}));
    await expect(auth.refresh()).rejects.toThrow();
    expect(auth.signedIn()).toBe(true);

    fetchMock.mockResolvedValue(json(400, { error: 'invalid_grant' }));
    await expect(auth.refresh()).rejects.toEqual(new AuthError('invalid_grant'));
    expect(auth.signedIn()).toBe(false);
    expect(sessionStorage.getItem('curbside.tokens')).toBeNull();
  });

  it('revokes the refresh token on sign-out', () => {
    const auth = session();
    auth.adopt(fakeTokens('google_1', 'r-9'));
    fetchMock.mockResolvedValue(json(200, {}));

    auth.signOut();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/oauth2/revoke');
    expect(new URLSearchParams(init.body as URLSearchParams).get('token')).toBe('r-9');
  });

  it('ends the Cognito session on a user sign-out', () => {
    const auth = session();
    auth.adopt(fakeTokens());
    fetchMock.mockResolvedValue(json(200, {}));

    auth.logOut();

    const url = new URL(redirects[0]);
    expect(url.pathname).toBe('/logout');
    expect(url.searchParams.get('logout_uri')).toBe(location.origin);
    expect(auth.signedIn()).toBe(false);
  });
});
