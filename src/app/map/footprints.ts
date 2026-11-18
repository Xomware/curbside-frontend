import { Injectable, inject } from '@angular/core';

import { Api } from '../api/api';
import { Footprint, decodeFootprints } from './geo';
import { Place } from './models';

/** `footprints_get`: 202 `{status: "pending"}` alone; otherwise status, source, version, count and url. */
interface Info {
  status: Place['footprint']['status'];
  version?: number;
  url?: string | null;
}

/**
 * A place's building outlines, cached by (mapId, version). In memory only: a persistent cache would keep the
 * outlines around someone's home on a shared computer after the tab (and its session) closed.
 */
@Injectable({ providedIn: 'root' })
export class FootprintLoader {
  private readonly api = inject(Api);
  private readonly cache = new Map<string, Footprint[]>();

  /** None while the file is pending, empty or failed. */
  async load(place: Place): Promise<Footprint[]> {
    if (place.footprint.status === 'ready') {
      const hit = this.cache.get(`${place.id}/v${place.footprint.version}`);
      if (hit) return hit;
    }
    const info = await this.api.request<Info>('GET', `/maps/${place.id}/footprints`);
    if (info.status !== 'ready' || !info.url || info.version === undefined) return [];
    const key = `${place.id}/v${info.version}`;
    const hit = this.cache.get(key);
    if (hit) return hit;

    // Presigned S3 URL: a bearer token would break the signature.
    const response = await fetch(info.url);
    if (!response.ok) throw new Error(`Footprint download failed: ${response.status}`);
    const footprints = decodeFootprints(JSON.parse(await inflate(await response.arrayBuffer())));
    for (const old of this.cache.keys()) if (old.startsWith(`${place.id}/`)) this.cache.delete(old);
    this.cache.set(key, footprints);
    return footprints;
  }
}

/** S3 sends `Content-Encoding: gzip` and the browser inflates; raw gzip bytes are inflated here if it ever doesn't. */
async function inflate(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer);
  if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) return new TextDecoder().decode(bytes);
  const stream = new Response(bytes).body?.pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
}
