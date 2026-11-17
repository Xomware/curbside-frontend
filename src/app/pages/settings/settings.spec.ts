import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { fakeTokens, json } from '../../../testing/fakes';
import { Account } from '../../account/account-store';
import { routes } from '../../app.routes';
import { AuthSession, REDIRECT } from '../../auth/auth-session';

const apple = {
  sub: 'sub-signinwithapple_1',
  provider: 'apple',
  created_at: '2026-11-10T12:00:00+00:00',
} as const;
const google = {
  sub: 'sub-google_1',
  provider: 'google',
  created_at: '2026-11-14T12:00:00+00:00',
} as const;
const account = (identities: Account['identities']): Account => ({
  account_id: 'a',
  display_name: 'Dom',
  created_at: '2026-11-10T12:00:00+00:00',
  identities,
});

describe('SettingsPage', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let redirects: string[];
  let harness: RouterTestingHarness;

  const el = () => harness.routeNativeElement as HTMLElement;
  const button = (text: string) =>
    [...el().querySelectorAll('button')].find((b) => b.textContent?.trim() === text) as
      HTMLButtonElement | undefined;
  const calls = (method: string) =>
    fetchMock.mock.calls.filter(([, init]) => init?.method === method);

  async function open(identities: Account['identities']) {
    fetchMock.mockResolvedValueOnce(json(200, { data: account(identities) }));
    harness = await RouterTestingHarness.create('/settings');
    await vi.waitFor(() => {
      harness.detectChanges();
      expect(el()?.querySelector('h1')?.textContent).toContain('Settings');
    });
  }

  beforeEach(() => {
    sessionStorage.clear();
    redirects = [];
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        { provide: REDIRECT, useValue: (url: string) => redirects.push(url) },
      ],
    });
    TestBed.inject(AuthSession).adopt(fakeTokens('google_1'));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('lists sign-ins, marks this browser, and offers the provider not yet linked', async () => {
    await open([google]);

    expect(el().querySelector('li')?.textContent).toContain('This browser');
    expect(button('Remove and sign out')?.disabled).toBe(true);
    expect(el().textContent).toContain("Your only sign-in can't be removed");
    expect(button('Continue with Apple')).toBeDefined();
    expect(button('Continue with Google')).toBeUndefined();
  });

  it('removes another sign-in and shows the account the API returns', async () => {
    await open([apple, google]);
    fetchMock.mockResolvedValueOnce(json(200, { data: account([google]) }));

    button('Remove')?.click();

    await vi.waitFor(() => {
      harness.detectChanges();
      expect(el().querySelectorAll('li')).toHaveLength(1);
    });
    expect(calls('DELETE')[0][0]).toContain('/me/identities/sub-signinwithapple_1');
    expect(TestBed.inject(AuthSession).signedIn()).toBe(true);
  });

  it('signs out after removing the sign-in this browser uses', async () => {
    await open([apple, google]);
    fetchMock.mockResolvedValue(json(200, { data: account([apple]) }));

    button('Remove and sign out')?.click();

    await vi.waitFor(() => expect(redirects.some((u) => u.includes('/logout'))).toBe(true));
    expect(TestBed.inject(AuthSession).signedIn()).toBe(false);
  });

  it('starts a link sign-in for a new provider', async () => {
    await open([google]);

    button('Continue with Apple')?.click();

    await vi.waitFor(() => expect(redirects).toHaveLength(1));
    expect(JSON.parse(sessionStorage.getItem('curbside.pending') ?? '{}').intent).toBe('link');
  });

  it('downloads the export as a JSON file', async () => {
    await open([google]);
    const blobs: Blob[] = [];
    vi.stubGlobal(
      'URL',
      Object.assign(URL, {
        createObjectURL: (blob: Blob) => (blobs.push(blob), 'blob:x'),
        revokeObjectURL: () => undefined,
      }),
    );
    const clicks = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    fetchMock.mockResolvedValueOnce(
      json(200, { data: { account: { display_name: 'Dom' }, maps: [] } }),
    );

    button('Export my data')?.click();

    await vi.waitFor(() => expect(clicks).toHaveBeenCalled());
    expect(JSON.parse(await blobs[0].text())).toEqual({
      account: { display_name: 'Dom' },
      maps: [],
    });
    expect((clicks.mock.contexts[0] as HTMLAnchorElement).download).toMatch(
      /^curbside-export-\d{4}-\d{2}-\d{2}\.json$/,
    );
    clicks.mockRestore();
  });

  it('shows why an export failed', async () => {
    await open([google]);
    fetchMock.mockResolvedValueOnce(
      json(500, { data: null, error: { code: 'internal', message: 'x' } }),
    );

    button('Export my data')?.click();

    await vi.waitFor(() => {
      harness.detectChanges();
      expect(el().querySelector('[role=alert]')?.textContent).toContain("couldn't do that");
    });
  });
});
