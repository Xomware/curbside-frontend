import { TestBed } from '@angular/core/testing';

import { fakeTokens, json } from '../../testing/fakes';
import { collection, place } from '../../testing/map-fixtures';
import { AuthSession } from '../auth/auth-session';
import { FootprintLoader } from './footprints';

const URL_V2 = 'https://bucket.s3.amazonaws.com/footprints/map1/v2.geojson.gz?X-Amz-Signature=x';

async function gzip(text: string): Promise<ArrayBuffer> {
  const stream = new Response(text).body?.pipeThrough(new CompressionStream('gzip'));
  return new Response(stream).arrayBuffer();
}

describe('FootprintLoader', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let loader: FootprintLoader;
  const body = JSON.stringify(collection);

  beforeEach(() => {
    sessionStorage.clear();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    TestBed.inject(AuthSession).adopt(fakeTokens());
    loader = TestBed.inject(FootprintLoader);
  });
  afterEach(() => vi.unstubAllGlobals());

  const info = (version: number, status = 'ready') =>
    json(200, {
      data: { status, source: 'osm', version, count: 3, url: status === 'ready' ? URL_V2 : null },
    });

  it('downloads the presigned file without a bearer token and parses it', async () => {
    fetchMock.mockResolvedValueOnce(info(2)).mockResolvedValueOnce(new Response(body));

    const footprints = await loader.load(place);

    expect(footprints.map((f) => f.id)).toEqual(['osm:way/1', 'osm:way/2', 'osm:way/3']);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.curbside.xomware.com/v1/maps/map1/footprints',
    );
    expect(fetchMock.mock.calls[1]).toEqual([URL_V2]);
  });

  it('inflates raw gzip bytes when the browser did not', async () => {
    fetchMock.mockResolvedValueOnce(info(2)).mockResolvedValueOnce(new Response(await gzip(body)));

    expect(await loader.load(place)).toHaveLength(3);
  });

  it('skips the API on a cache hit for the same version', async () => {
    fetchMock.mockResolvedValueOnce(info(2)).mockResolvedValueOnce(new Response(body));
    await loader.load(place);

    expect(await loader.load(place)).toHaveLength(3);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('downloads again when the version moves', async () => {
    fetchMock
      .mockResolvedValueOnce(info(2))
      .mockResolvedValueOnce(new Response(body))
      .mockResolvedValueOnce(info(3))
      .mockResolvedValueOnce(new Response(JSON.stringify({ features: [] })));
    await loader.load(place);

    expect(await loader.load({ ...place, footprint: { status: 'ready', version: 3 } })).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('draws nothing while pending, empty or failed', async () => {
    fetchMock
      .mockResolvedValueOnce(json(202, { data: { status: 'pending' } }))
      .mockResolvedValueOnce(info(1, 'empty'))
      .mockResolvedValueOnce(info(1, 'failed'));
    const pending = { ...place, footprint: { status: 'pending', version: 0 } } as const;

    expect(await loader.load(pending)).toEqual([]);
    expect(await loader.load(place)).toEqual([]);
    expect(await loader.load(place)).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('throws on a failed download', async () => {
    fetchMock
      .mockResolvedValueOnce(info(2))
      .mockResolvedValueOnce(new Response('', { status: 403 }));

    await expect(loader.load(place)).rejects.toThrow('403');
  });
});
