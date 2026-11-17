import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { fakeTokens, json } from '../../../testing/fakes';
import { AuthSession, Pending, REDIRECT } from '../../auth/auth-session';
import { routes } from '../../app.routes';

describe('CallbackPage', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let redirects: string[];

  async function land(pending: Omit<Pending, 'state' | 'verifier'>, ...responses: Response[]) {
    sessionStorage.setItem(
      'curbside.pending',
      JSON.stringify({ state: 's', verifier: 'v', ...pending }),
    );
    history.replaceState(null, '', '/auth/callback?state=s&code=c');
    for (const response of responses) fetchMock.mockResolvedValueOnce(response);
    const harness = await RouterTestingHarness.create('/auth/callback');
    // Landing on / starts the shell's GET /me, so later calls are expected.
    await vi.waitFor(() =>
      expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(responses.length),
    );
    await harness.fixture.whenStable();
    harness.detectChanges();
    return harness;
  }

  const tokenResponse = (username: string) => {
    const t = fakeTokens(username);
    return json(200, { access_token: t.access, id_token: t.id, refresh_token: t.refresh });
  };
  const posts = () =>
    fetchMock.mock.calls.filter(
      ([, init]) => init?.method === 'POST' && String(init.body).startsWith('{'),
    );

  beforeEach(() => {
    sessionStorage.clear();
    redirects = [];
    fetchMock = vi
      .fn()
      .mockResolvedValue(json(200, { data: { display_name: 'Dom', identities: [] } }));
    vi.stubGlobal('fetch', fetchMock);
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        { provide: REDIRECT, useValue: (url: string) => redirects.push(url) },
      ],
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('adopts the session on a plain sign-in', async () => {
    await land({ provider: 'Google', intent: 'sign-in' }, tokenResponse('google_1'));

    await vi.waitFor(() => expect(TestBed.inject(AuthSession).signedIn()).toBe(true));
    expect(posts()).toEqual([]);
  });

  it('links the orphan sign-in after signing in with the existing account', async () => {
    const orphan = fakeTokens('google_2').id;
    await land(
      { provider: 'SignInWithApple', intent: 'sign-in', linkIdToken: orphan },
      tokenResponse('signinwithapple_1'),
      json(201, { data: { sub: 'x', provider: 'google' } }),
    );

    await vi.waitFor(() => expect(posts()).toHaveLength(1));
    const [url, init] = posts()[0];
    expect(url).toContain('/me/identities');
    expect(JSON.parse(init.body)).toEqual({ id_token: orphan });
    expect(init.headers.Authorization).toBe(`Bearer ${fakeTokens('signinwithapple_1').access}`);
  });

  it('runs a fresh sign-in for the orphan when its ID token has gone stale', async () => {
    await land(
      { provider: 'SignInWithApple', intent: 'sign-in', linkIdToken: fakeTokens('google_2').id },
      tokenResponse('signinwithapple_1'),
      json(400, { data: null, error: { code: 'invalid_id_token', message: 'stale' } }),
    );

    await vi.waitFor(() => expect(redirects).toHaveLength(1));
    expect(new URL(redirects[0]).searchParams.get('identity_provider')).toBe('Google');
    expect(JSON.parse(sessionStorage.getItem('curbside.pending') ?? '{}').intent).toBe('link');
  });

  it('explains when the other sign-in has its own account', async () => {
    const harness = await land(
      { provider: 'SignInWithApple', intent: 'sign-in', linkIdToken: fakeTokens('google_2').id },
      tokenResponse('signinwithapple_1'),
      json(409, { data: null, error: { code: 'identity_in_use', message: 'in use' } }),
    );

    await vi.waitFor(() => {
      harness.detectChanges();
      expect(harness.routeNativeElement?.querySelector('[role=alert]')?.textContent).toContain(
        "can't be merged",
      );
    });
  });

  it('keeps the current session on a settings link and posts the new ID token', async () => {
    TestBed.inject(AuthSession).adopt(fakeTokens('google_1'));
    await land(
      { provider: 'SignInWithApple', intent: 'link' },
      tokenResponse('signinwithapple_9'),
      json(201, { data: {} }),
    );

    await vi.waitFor(() => expect(posts()).toHaveLength(1));
    expect(TestBed.inject(AuthSession).accessToken()).toBe(fakeTokens('google_1').access);
    expect(JSON.parse(posts()[0][1].body)).toEqual({
      id_token: fakeTokens('signinwithapple_9').id,
    });
  });

  it('rejects a forged state', async () => {
    sessionStorage.setItem(
      'curbside.pending',
      JSON.stringify({ state: 'other', verifier: 'v', provider: 'Google', intent: 'sign-in' }),
    );
    history.replaceState(null, '', '/auth/callback?state=s&code=c');
    const harness = await RouterTestingHarness.create('/auth/callback');
    await vi.waitFor(() => {
      harness.detectChanges();
      expect(harness.routeNativeElement?.querySelector('[role=alert]')?.textContent).toContain(
        "didn't finish",
      );
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
