import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { fakeTokens, json } from '../../../testing/fakes';
import { collection, household, place } from '../../../testing/map-fixtures';
import { AuthSession } from '../../auth/auth-session';
import { MapStore, REVERSE_GEOCODE } from '../../map/map-store';
import { MAPKIT_TOKEN } from '../../map/mapkit';
import { MapPage } from './map-page';

describe('MapPage', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sessionStorage.clear();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: MAPKIT_TOKEN, useValue: '' },
        { provide: REVERSE_GEOCODE, useValue: async () => '11 Quillfeather Ln' },
      ],
    });
    TestBed.inject(AuthSession).adopt(fakeTokens());
  });
  afterEach(() => vi.unstubAllGlobals());

  async function render(text: string) {
    const fixture = TestBed.createComponent(MapPage);
    const el = fixture.nativeElement as HTMLElement;
    await vi.waitFor(async () => {
      await fixture.whenStable();
      expect(el.textContent).toContain(text);
    });
    return { fixture, el };
  }

  const homes = [
    household('a', {
      private: { label: 'Mossbottom', address: '21 Quillfeather Ln', last_talked_at: null },
    }),
    household('b', {
      building_id: 'osm:way/1',
      private: { label: 'Pumpernickel', address: '11 Quillfeather Ln', last_talked_at: null },
    }),
    household('c', {}, 'Quillby'),
  ];

  function mapLoads(footprints: 'ready' | 'pending') {
    fetchMock
      .mockResolvedValueOnce(json(200, { data: [place] }))
      .mockResolvedValueOnce(json(200, { data: { map: place, households: homes } }));
    if (footprints === 'pending')
      fetchMock.mockResolvedValueOnce(json(202, { data: { status: 'pending' } }));
    else
      fetchMock
        .mockResolvedValueOnce(
          json(200, { data: { status: 'ready', version: 2, url: 'https://s3/x' } }),
        )
        .mockResolvedValueOnce(new Response(JSON.stringify(collection)));
  }

  it('lists every household by house number, links each card, and says the map is unavailable', async () => {
    mapLoads('pending');
    const { el } = await render('Map unavailable');

    expect(el.querySelector('h1')?.textContent).toBe('Quillfeather Ln');
    expect(el.textContent).toContain('3 homes');
    const links = [...el.querySelectorAll('ul a')];
    expect(links.map((a) => a.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      '11 Pumpernickel',
      '21 Mossbottom',
      'Quillby',
    ]);
    expect(links[0].getAttribute('href')).toBe('/households/b');
    expect(el.textContent).not.toContain('OpenStreetMap');
  });

  it('credits OpenStreetMap once outlines are drawn, and lists the picked building', async () => {
    mapLoads('ready');
    const { fixture, el } = await render('OpenStreetMap contributors');

    await TestBed.inject(MapStore).tap(40.00005, -74.99995);
    await fixture.whenStable();

    const panel = el.querySelector('.panel') as HTMLElement;
    expect(panel.querySelector('h2')?.textContent).toBe('11 Quillfeather Ln');
    expect(panel.textContent).toContain('Pumpernickel');
  });

  it('sets up a street from your location when there is none yet', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout'] });
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (done: PositionCallback) =>
          done({ coords: { latitude: 40, longitude: -75 } } as GeolocationPosition),
      },
    });
    fetchMock
      .mockResolvedValueOnce(json(200, { data: [] }))
      .mockResolvedValueOnce(
        json(201, { data: { ...place, footprint: { status: 'pending', version: 0 } } }),
      );
    const { fixture, el } = await render('New street');
    const make = [...el.querySelectorAll('button')].find((b) => b.textContent?.includes('Make'));
    expect(make?.disabled).toBe(true);

    [...el.querySelectorAll('button')].find((b) => b.textContent?.includes('my location'))?.click();
    const name = el.querySelector<HTMLInputElement>('#setup-name')!;
    name.value = 'Quillfeather Ln';
    name.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    make?.click();
    await vi.waitFor(async () => {
      await fixture.whenStable();
      expect(el.querySelector('h1')?.textContent).toBe('Quillfeather Ln');
    });

    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe('https://api.curbside.xomware.com/v1/maps');
    expect(JSON.parse(init.body)).toEqual({
      name: 'Quillfeather Ln',
      center: { lat: 40, lng: -75 },
      radius_m: 300,
    });

    // Outlines are fetched server-side after create; the page polls the map until they land.
    fetchMock
      .mockResolvedValueOnce(json(200, { data: { map: place, households: [] } }))
      .mockResolvedValueOnce(
        json(200, { data: { status: 'ready', version: 2, url: 'https://s3/x' } }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify(collection)));
    await vi.advanceTimersByTimeAsync(3000);
    await vi.waitFor(() => expect(TestBed.inject(MapStore).footprints().length).toBeGreaterThan(0));
    vi.useRealTimers();
  });

  it('retries a failed load', async () => {
    fetchMock.mockResolvedValueOnce(json(500, {}));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { el } = await render("Couldn't load your map.");

    mapLoads('pending');
    (el.querySelector('.page .btn') as HTMLButtonElement).click();

    await vi.waitFor(() => expect(TestBed.inject(MapStore).status()).toBe('ready'));
  });

  it('offers + Add at a dropped pin with the looked-up address filled in', async () => {
    mapLoads('pending');
    const { fixture, el } = await render('Map unavailable');

    await TestBed.inject(MapStore).drop(40.2, -75.2);
    await fixture.whenStable();
    expect(el.querySelector('.panel')?.textContent).toContain('Nobody added here yet.');
    const add = [...el.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('a household here'),
    );
    add?.click();
    await fixture.whenStable();

    expect((el.querySelector('#hh-address') as HTMLInputElement).value).toBe('11 Quillfeather Ln');
  });
});
