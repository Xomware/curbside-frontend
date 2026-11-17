import { fakeJwt, json } from '../../testing/fakes';
import { AuthError, authorizeUrl, exchange, providerOf } from './cognito';

describe('cognito', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('builds an authorize URL that skips the hosted picker and carries PKCE', () => {
    const url = new URL(authorizeUrl('SignInWithApple', 'chal', 'st'));

    expect(url.origin).toBe('https://xomware-curbside.auth.us-east-1.amazoncognito.com');
    expect(url.pathname).toBe('/oauth2/authorize');
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      response_type: 'code',
      identity_provider: 'SignInWithApple',
      redirect_uri: `${location.origin}/auth/callback`,
      state: 'st',
      code_challenge: 'chal',
      code_challenge_method: 'S256',
    });
  });

  it('keeps the old refresh token when a refresh grant leaves it out', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(json(200, { access_token: 'a', id_token: 'i' })),
    );

    expect(await exchange({ grant_type: 'refresh_token' }, 'r')).toEqual({
      access: 'a',
      id: 'i',
      refresh: 'r',
    });
  });

  it('turns an OAuth error into an AuthError and a 5xx into a plain Error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(400, { error: 'invalid_grant' })));
    await expect(exchange({})).rejects.toEqual(new AuthError('invalid_grant'));

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(503, {})));
    const outage = await exchange({}).catch((e: unknown) => e);
    expect(outage).toBeInstanceOf(Error);
    expect(outage).not.toBeInstanceOf(AuthError);
  });

  it('reads the provider from the Cognito username', () => {
    expect(providerOf(fakeJwt({ 'cognito:username': 'signinwithapple_0001' }))).toBe(
      'SignInWithApple',
    );
    expect(providerOf(fakeJwt({ 'cognito:username': 'google_42' }))).toBe('Google');
  });
});
