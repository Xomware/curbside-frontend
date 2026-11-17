import { TestBed } from '@angular/core/testing';

import { fakeTokens, json } from '../../testing/fakes';
import { AuthSession } from '../auth/auth-session';
import { Api, ApiError } from './api';

describe('Api', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let api: Api;
  let auth: AuthSession;

  beforeEach(() => {
    sessionStorage.clear();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    api = TestBed.inject(Api);
    auth = TestBed.inject(AuthSession);
    auth.adopt(fakeTokens());
  });
  afterEach(() => vi.unstubAllGlobals());

  it('sends the bearer token and unwraps data', async () => {
    fetchMock.mockResolvedValue(
      json(200, { data: { display_name: 'Dom' }, error: null, meta: {} }),
    );

    expect(await api.request('GET', '/me')).toEqual({ display_name: 'Dom' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.curbside.xomware.com/v1/me');
    expect(init.headers.Authorization).toBe(`Bearer ${auth.accessToken()}`);
  });

  it('surfaces the envelope error code', async () => {
    fetchMock.mockResolvedValue(
      json(404, { data: null, error: { code: 'needs_onboarding', message: 'No account' } }),
    );

    await expect(api.request('GET', '/me')).rejects.toEqual(
      new ApiError(404, 'needs_onboarding', 'No account'),
    );
  });

  it('refreshes once and retries on 401', async () => {
    fetchMock
      .mockResolvedValueOnce(json(401, { message: 'Unauthorized' }))
      .mockResolvedValueOnce(json(200, { access_token: 'fresh', id_token: 'i' }))
      .mockResolvedValueOnce(json(200, { data: 'ok' }));

    expect(await api.request('GET', '/me')).toBe('ok');
    expect(fetchMock.mock.calls[2][1].headers.Authorization).toBe('Bearer fresh');
  });

  it('signs out when the retry is also a 401', async () => {
    fetchMock
      .mockResolvedValueOnce(json(401, { message: 'Unauthorized' }))
      .mockResolvedValueOnce(json(200, { access_token: 'fresh', id_token: 'i' }))
      .mockResolvedValueOnce(json(401, { message: 'Unauthorized' }))
      .mockResolvedValue(json(200, {}));

    await expect(api.request('GET', '/me')).rejects.toMatchObject({ status: 401 });
    expect(auth.signedIn()).toBe(false);
  });
});
