import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { answerBy, fakeTokens, json } from '../../../testing/fakes';
import { household, place } from '../../../testing/map-fixtures';
import { routes } from '../../app.routes';
import { AuthSession, REDIRECT } from '../../auth/auth-session';
import { rememberReturn } from '../../auth/return-to';
import { MAPKIT_TOKEN } from '../../map/mapkit';

describe('WelcomePage', () => {
  const me = { account_id: 'a', display_name: 'Dom', identities: [] };
  const home = household('h1', {}, "Dom's");
  let answers: Record<string, Response[]>;
  let fetchMock: ReturnType<typeof vi.fn>;
  let redirects: string[];
  let harness: RouterTestingHarness;

  const el = () => harness.routeNativeElement as HTMLElement;
  const button = (text: string) =>
    [...el().querySelectorAll('button')].find((b) =>
      b.textContent?.includes(text),
    ) as HTMLButtonElement;
  const type = (selector: string, value: string) => {
    const input = el().querySelector(selector) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    harness.detectChanges();
  };
  const settle = (text: string) =>
    vi.waitFor(() => {
      harness.detectChanges();
      expect(el().textContent).toContain(text);
    });
  const url = () => TestBed.inject(Router).url;
  const sent = (key: string) =>
    fetchMock.mock.calls
      .filter(([u, init]) => `${init?.method ?? 'GET'} ${new URL(u).pathname}` === `${key}`)
      .map(([, init]) => JSON.parse(init.body));

  beforeEach(async () => {
    sessionStorage.clear();
    localStorage.clear();
    redirects = [];
    answers = {
      'GET /me': [json(200, { data: me })],
      'POST /me': [json(201, { data: me })],
      'GET /maps': [json(200, { data: [] })],
      'POST /maps': [
        json(201, { data: { ...place, footprint: { status: 'pending', version: 0 } } }),
      ],
      'POST /maps/map1/households': [json(201, { data: home })],
      'GET /maps/map1/households/h1': [json(200, { data: home })],
      'POST /maps/map1/households/h1/people': [
        json(201, { data: { id: 'p1', version: 1, name: 'Ida', role: 'kid' } }),
      ],
      'POST /maps/map1/households/h1/pets': [
        json(201, { data: { id: 'x1', version: 1, name: 'Waffles' } }),
      ],
      'GET /activity': [json(200, { data: { items: [], unread: 0 } })],
      'GET /maps/map1/footprints': [json(202, { data: { status: 'pending' } })],
    };
    fetchMock = vi.fn(answerBy(answers));
    vi.stubGlobal('fetch', fetchMock);
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (done: PositionCallback) =>
          done({ coords: { latitude: 40, longitude: -75 } } as GeolocationPosition),
      },
    });
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        { provide: REDIRECT, useValue: (url: string) => redirects.push(url) },
        { provide: MAPKIT_TOKEN, useValue: '' },
      ],
    });
    TestBed.inject(AuthSession).adopt(fakeTokens('google_2'));
  });
  afterEach(() => vi.unstubAllGlobals());

  async function start(path = '/welcome') {
    harness = await RouterTestingHarness.create(path);
  }

  it('creates the account with the trimmed name, then asks where you live', async () => {
    await start();
    expect(el().textContent).toContain('Step 1 of 4');
    expect(button('Next').disabled).toBe(true);
    type('input', '  Dom ');

    button('Next').click();

    await settle('Where do you live?');
    expect(sent('POST /v1/me')).toEqual([{ display_name: 'Dom' }]);
    expect(url()).toBe('/welcome?step=home');
    expect(el().textContent).toContain('Step 2 of 4');
  });

  it('rejects a blank name', async () => {
    await start();
    type('input', '   ');

    expect(button('Next').disabled).toBe(true);
  });

  it('goes back to an invite opened while signed out, mid-walkthrough', async () => {
    rememberReturn('/invite/K7QW2M9XRT');
    answers['GET /invites/K7QW2M9XRT'] = [json(500, {})];
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await start();
    type('input', 'Dom');

    button('Next').click();

    await vi.waitFor(() => expect(url()).toBe('/invite/K7QW2M9XRT'));
    expect(sessionStorage.getItem('curbside.onboarding')).toBe('1');
  });

  it('carries this sign-in into the other provider sign-in for linking', async () => {
    await start();
    button('Continue with Apple').click();

    await vi.waitFor(() => expect(redirects).toHaveLength(1));
    expect(new URL(redirects[0]).searchParams.get('identity_provider')).toBe('SignInWithApple');
    const pending = JSON.parse(sessionStorage.getItem('curbside.pending') ?? '{}');
    expect(pending).toMatchObject({ intent: 'sign-in', linkIdToken: fakeTokens('google_2').id });
  });

  it('makes a street around your home and puts your household on it', async () => {
    await start('/welcome?step=home');
    await settle('Where do you live?');
    await vi.waitFor(() =>
      expect((el().querySelector('#home-label') as HTMLInputElement).value).toBe("Dom's"),
    );

    button('Use my location').click();
    await settle('Your pin');
    type('#home-street', 'Quillfeather Ln');
    button('Put me on the map').click();

    await vi.waitFor(() => expect(url()).toBe('/welcome?step=people&household=h1'));
    expect(sent('POST /v1/maps')).toEqual([
      { name: 'Quillfeather Ln', center: { lat: 40, lng: -75 }, radius_m: 300 },
    ]);
    expect(sent('POST /v1/maps/map1/households')).toEqual([{ label: "Dom's", lat: 40, lng: -75 }]);
    expect(JSON.parse(localStorage.getItem('curbside.homes') ?? '{}')).toEqual({ map1: 'h1' });
  });

  it('on a street you joined, offers to add your home there and lets you skip', async () => {
    answers['GET /maps'] = [json(200, { data: [place] })];
    answers['GET /maps/map1'] = [json(200, { data: { map: place, households: [] } })];
    await start('/welcome?step=home');
    await settle('Add your home to Quillfeather Ln?');
    expect(el().querySelector('#home-street')).toBeNull();

    button('Skip for now').click();

    await settle('Tap a house');
    expect(url()).toBe('/welcome?step=tour');
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
  });

  it('adds people and pets by name, then tours once and opens the street', async () => {
    answers['GET /maps'] = [json(200, { data: [place] })];
    answers['GET /maps/map1'] = [json(200, { data: { map: place, households: [home] } })];
    await start('/welcome?step=people&household=h1');
    await settle('Who lives with you?');
    expect(button('Skip for now')).toBeTruthy();

    type('#member-name', 'Ida');
    await vi.waitFor(() => {
      harness.detectChanges();
      expect(button('Add').disabled).toBe(false);
    });
    (el().querySelector('input[value="kid"]') as HTMLInputElement).click();
    button('Add').click();
    await settle('Ida');
    type('#member-name', 'Waffles');
    (el().querySelector('input[value="pet"]') as HTMLInputElement).click();
    button('Add').click();
    await settle('Waffles');
    expect(sent('POST /v1/maps/map1/households/h1/people')).toEqual([{ name: 'Ida', role: 'kid' }]);
    expect(sent('POST /v1/maps/map1/households/h1/pets')).toEqual([{ name: 'Waffles' }]);

    button('Next').click();
    await settle('1 of 3');
    button('Next').click();
    await settle('Tap anywhere to add a neighbor');
    button('Skip the tour').click();

    await vi.waitFor(() => expect(url()).toBe('/'));
    expect(localStorage.getItem('curbside.toured')).toBe('1');
  });

  it('skips the tour when this browser has seen it', async () => {
    localStorage.setItem('curbside.toured', '1');
    sessionStorage.setItem('curbside.onboarding', '1');
    answers['GET /maps'] = [json(200, { data: [place] })];
    answers['GET /maps/map1'] = [json(200, { data: { map: place, households: [home] } })];
    await start('/welcome?step=people&household=h1');
    await settle('Who lives with you?');

    button('Skip for now').click();

    await vi.waitFor(() => expect(url()).toBe('/'));
    expect(sessionStorage.getItem('curbside.onboarding')).toBeNull();
  });
});
