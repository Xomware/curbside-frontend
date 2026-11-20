import { TestBed } from '@angular/core/testing';

import { MAPKIT_TOKEN, MapKit, MapKitJs } from './mapkit';

describe('MapKit', () => {
  const scripts = () => document.head.querySelectorAll('script[src*="apple-mapkit"]');
  const setup = (token: string) => {
    TestBed.configureTestingModule({ providers: [{ provide: MAPKIT_TOKEN, useValue: token }] });
    return TestBed.inject(MapKit);
  };
  afterEach(() => {
    scripts().forEach((s) => s.remove());
    vi.unstubAllGlobals();
  });

  it('stays map-less without a token and never fetches Apple’s script', async () => {
    const mapkit = setup('');

    expect(await mapkit.load()).toBeNull();
    expect(await mapkit.address(40, -75)).toBeNull();
    expect(scripts()).toHaveLength(0);
  });

  it('loads the script once and authorizes with the token', async () => {
    const mapkit = setup('tok');
    const init = vi.fn();
    const loading = mapkit.load();
    void mapkit.load();

    expect(scripts()).toHaveLength(1);
    const script = scripts()[0] as HTMLScriptElement;
    expect(script.dataset['libraries']).toBe('map,annotations,overlays,services');
    vi.stubGlobal('mapkit', { init });
    (window as unknown as Record<string, () => void>)[script.dataset['callback'] ?? '']();

    expect(await loading).toEqual({ init });
    const done = vi.fn();
    init.mock.calls[0][0].authorizationCallback(done);
    expect(done).toHaveBeenCalledWith('tok');
  });

  it('falls back to no map when the script fails', async () => {
    const mapkit = setup('tok');
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const loading = mapkit.load();

    scripts()[0].dispatchEvent(new Event('error'));

    expect(await loading).toBeNull();
  });

  it('finds a typed address, or nothing', async () => {
    const mapkit = setup('tok');
    const places = [
      { coordinate: { latitude: 40, longitude: -75 }, fullThoroughfare: '11 Quillfeather Ln' },
    ];
    const results = [places, []];
    class Search {
      search(_: string, done: (e: null, d: { places: unknown[] }) => void) {
        done(null, { places: results.shift() ?? [] });
      }
    }
    vi.spyOn(mapkit, 'load').mockResolvedValue({ Search } as unknown as MapKitJs);

    expect(await mapkit.search('11 quillfeather')).toEqual({
      lat: 40,
      lng: -75,
      address: '11 Quillfeather Ln',
    });
    expect(await mapkit.search('nowhere')).toBeNull();
  });
});
