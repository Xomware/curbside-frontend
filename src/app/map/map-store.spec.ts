import { TestBed } from '@angular/core/testing';

import { fakeTokens, json } from '../../testing/fakes';
import { collection, household, place } from '../../testing/map-fixtures';
import { AuthSession } from '../auth/auth-session';
import { MapStore, REVERSE_GEOCODE } from './map-store';

describe('MapStore', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let store: MapStore;
  let geocode: ReturnType<typeof vi.fn>;
  const a = household('a', { building_id: 'osm:way/1' }, 'Pumpernickel');
  const b = household('b', { building_id: 'osm:way/1' }, 'Crumpet');
  const c = household('c', { building_id: 'osm:way/2' }, 'Fizzwhistle');

  beforeEach(() => {
    sessionStorage.clear();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    geocode = vi.fn().mockResolvedValue('11 Quillfeather Ln');
    TestBed.configureTestingModule({
      providers: [{ provide: REVERSE_GEOCODE, useValue: geocode }],
    });
    TestBed.inject(AuthSession).adopt(fakeTokens());
    store = TestBed.inject(MapStore);
  });
  afterEach(() => vi.unstubAllGlobals());

  async function loaded() {
    fetchMock
      .mockResolvedValueOnce(json(200, { data: [place] }))
      .mockResolvedValueOnce(json(200, { data: { map: place, households: [a, b, c] } }));
    await store.ensure();
  }

  it('opens the first map with its households, once per tab', async () => {
    await loaded();
    await store.ensure();

    expect(store.status()).toBe('ready');
    expect(store.place()?.name).toBe('Quillfeather Ln');
    expect(store.households()).toHaveLength(3);
    expect(fetchMock.mock.calls[1][0]).toBe('https://api.curbside.xomware.com/v1/maps/map1');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('says so when the account has no place, and retries after a failure', async () => {
    fetchMock.mockResolvedValueOnce(json(500, {}));
    await store.ensure();
    expect(store.status()).toBe('failed');

    fetchMock.mockResolvedValueOnce(json(200, { data: [] }));
    await store.ensure();
    expect(store.status()).toBe('none');
  });

  it('falls back to plaques when the outlines fail', async () => {
    await loaded();
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await store.loadFootprints();

    expect(store.footprints()).toEqual([]);
  });

  async function withOutlines() {
    await loaded();
    fetchMock
      .mockResolvedValueOnce(
        json(200, { data: { status: 'ready', version: 2, url: 'https://s3/x' } }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify(collection)));
    await store.loadFootprints();
  }

  it('selects the tapped building with its households and the looked-up address', async () => {
    await withOutlines();

    await store.tap(40.00005, -74.99995);

    expect(store.selection()).toEqual({
      lat: 40.00005,
      lng: -74.99995,
      buildingId: 'osm:way/1',
      address: '11 Quillfeather Ln',
    });
    expect(store.selected().map((h) => h.id)).toEqual(['a', 'b']);
  });

  it('clears on open ground and accessory buildings; a long-press drops a pin anywhere', async () => {
    await withOutlines();
    await store.tap(40.00005, -74.99995);

    await store.tap(40.00205, -74.99995);
    expect(store.selection()).toBeNull();

    await store.drop(40.1, -75.1);
    expect(store.selection()).toMatchObject({ buildingId: null, address: '11 Quillfeather Ln' });
    expect(store.selected()).toEqual([]);
  });

  it('keeps the newer selection when an older lookup answers late', async () => {
    await withOutlines();
    let answer: (value: string) => void = () => undefined;
    geocode.mockReturnValueOnce(new Promise((resolve) => (answer = resolve)));

    const first = store.tap(40.00005, -74.99995);
    await store.drop(40.1, -75.1);
    answer('stale');
    await first;

    expect(store.selection()).toMatchObject({ lat: 40.1, address: '11 Quillfeather Ln' });
  });

  it('upserts a household and refreshes from the map', async () => {
    await loaded();
    store.upsert({ ...a, version: 2 });
    store.upsert(household('d'));
    expect(store.households().map((h) => [h.id, h.version])).toEqual([
      ['a', 2],
      ['b', 1],
      ['c', 1],
      ['d', 1],
    ]);

    fetchMock.mockResolvedValueOnce(json(200, { data: { map: place, households: [a] } }));
    await store.refresh();
    expect(store.households()).toEqual([a]);
  });

  it('adds a household at the pick, with its building only when there is one', async () => {
    await loaded();
    const made = household('n', {}, 'Quillby');
    fetchMock
      .mockResolvedValueOnce(json(201, { data: made }))
      .mockResolvedValueOnce(json(201, { data: made }));
    store.selection.set({
      lat: 40.1,
      lng: -75.1,
      buildingId: 'osm:way/9',
      address: '25 Quillfeather Ln',
    });

    await store.create(store.selection()!, 'Quillby', '25 Quillfeather Ln');
    await store.create({ lat: 1, lng: 2, buildingId: null }, 'Quillby', null);

    const bodies = fetchMock.mock.calls.slice(2).map(([, init]) => JSON.parse(init.body));
    expect(bodies).toEqual([
      {
        label: 'Quillby',
        lat: 40.1,
        lng: -75.1,
        address: '25 Quillfeather Ln',
        building_id: 'osm:way/9',
      },
      { label: 'Quillby', lat: 1, lng: 2 },
    ]);
    expect(fetchMock.mock.calls[2][0]).toBe(
      'https://api.curbside.xomware.com/v1/maps/map1/households',
    );
    expect(store.household('n')).toBeDefined();
    expect(store.selection()).toBeNull();
  });
});
