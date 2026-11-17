import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { fakeTokens, json } from '../../../testing/fakes';
import { routes } from '../../app.routes';
import { AuthSession, REDIRECT } from '../../auth/auth-session';

describe('WelcomePage', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let redirects: string[];
  let harness: RouterTestingHarness;

  const el = () => harness.routeNativeElement as HTMLElement;
  const button = (text: string) =>
    [...el().querySelectorAll('button')].find((b) =>
      b.textContent?.includes(text),
    ) as HTMLButtonElement;

  beforeEach(async () => {
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
    TestBed.inject(AuthSession).adopt(fakeTokens('google_2'));
    harness = await RouterTestingHarness.create('/welcome');
  });
  afterEach(() => vi.unstubAllGlobals());

  it('creates the account with the trimmed name', async () => {
    expect(button('Start mapping').disabled).toBe(true);
    fetchMock.mockResolvedValue(json(201, { data: { display_name: 'Dom', identities: [] } }));
    const input = el().querySelector('input') as HTMLInputElement;
    input.value = '  Dom ';
    input.dispatchEvent(new Event('input'));
    harness.detectChanges();

    button('Start mapping').click();

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/me');
    expect(JSON.parse(init.body)).toEqual({ display_name: 'Dom' });
  });

  it('rejects a blank name', () => {
    const input = el().querySelector('input') as HTMLInputElement;
    input.value = '   ';
    input.dispatchEvent(new Event('input'));
    harness.detectChanges();

    expect(button('Start mapping').disabled).toBe(true);
  });

  it('carries this sign-in into the other provider sign-in for linking', async () => {
    button('Continue with Apple').click();

    await vi.waitFor(() => expect(redirects).toHaveLength(1));
    expect(new URL(redirects[0]).searchParams.get('identity_provider')).toBe('SignInWithApple');
    const pending = JSON.parse(sessionStorage.getItem('curbside.pending') ?? '{}');
    expect(pending).toMatchObject({ intent: 'sign-in', linkIdToken: fakeTokens('google_2').id });
  });
});
