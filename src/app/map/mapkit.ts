import { DOCUMENT, Injectable, InjectionToken, inject } from '@angular/core';

import { environment } from '../../environments/environment';

// The slice of MapKit JS 5 this app uses. Apple ships no types, and @types lags the 5.x API.
export interface MkCoordinate {
  latitude: number;
  longitude: number;
}
export interface MkOverlay {
  style: object;
  data: { id: string };
}
export interface MkMap {
  colorScheme: string;
  region: object;
  overlays: MkOverlay[];
  annotations: object[];
  addOverlays(overlays: MkOverlay[]): void;
  removeOverlays(overlays: MkOverlay[]): void;
  addAnnotations(annotations: object[]): void;
  removeAnnotations(annotations: object[]): void;
  addEventListener(
    type: 'single-tap' | 'long-press',
    listener: (event: { pointOnPage: DOMPoint }) => void,
  ): void;
  convertPointOnPageToCoordinate(point: DOMPoint): MkCoordinate;
  destroy(): void;
}
interface MkPlace {
  name?: string;
  fullThoroughfare?: string;
  formattedAddress?: string;
  coordinate: MkCoordinate;
}
export interface MapKitJs {
  init(options: { authorizationCallback: (done: (token: string) => void) => void }): void;
  Map: {
    new (element: HTMLElement, options: object): MkMap;
    MapTypes: { MutedStandard: string };
    ColorSchemes: { Light: string; Dark: string };
  };
  Coordinate: new (lat: number, lng: number) => MkCoordinate;
  CoordinateSpan: new (latDelta: number, lngDelta: number) => object;
  CoordinateRegion: new (center: MkCoordinate, span: object) => object;
  Style: new (options: object) => object;
  CircleOverlay: new (center: MkCoordinate, radius: number, options: object) => MkOverlay;
  PolygonOverlay: new (points: MkCoordinate[][], options: object) => MkOverlay;
  Annotation: new (at: MkCoordinate, factory: () => HTMLElement, options: object) => object;
  PointOfInterestFilter: { excludingAllCategories: object };
  Geocoder: new () => {
    reverseLookup(
      at: MkCoordinate,
      done: (error: Error | null, data: { results: MkPlace[] }) => void,
    ): void;
  };
  Search: new () => {
    search(query: string, done: (error: Error | null, data: { places: MkPlace[] }) => void): void;
  };
}

/** A searched address and where it is. */
export interface Found {
  lat: number;
  lng: number;
  address: string | null;
}

export const MAPKIT_TOKEN = new InjectionToken<string>('MAPKIT_TOKEN', {
  factory: () => environment.mapkitToken,
});

const SCRIPT = 'https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.core.js';

/** Loads MapKit JS once, on first use. Null when there is no token or Apple's script fails: the map is optional. */
@Injectable({ providedIn: 'root' })
export class MapKit {
  private readonly token = inject(MAPKIT_TOKEN);
  private readonly document = inject(DOCUMENT);
  private loading: Promise<MapKitJs | null> | null = null;

  load(): Promise<MapKitJs | null> {
    this.loading ??= this.token ? this.inject() : Promise.resolve(null);
    return this.loading;
  }

  private inject(): Promise<MapKitJs | null> {
    const window = this.document.defaultView as (Window & Record<string, unknown>) | null;
    if (!window) return Promise.resolve(null);
    return new Promise((resolve) => {
      window['curbsideMapKitReady'] = () => {
        const mapkit = window['mapkit'] as MapKitJs;
        mapkit.init({ authorizationCallback: (done) => done(this.token) });
        resolve(mapkit);
      };
      const script = this.document.createElement('script');
      script.src = SCRIPT;
      script.crossOrigin = 'anonymous';
      script.dataset['callback'] = 'curbsideMapKitReady';
      script.dataset['libraries'] = 'map,annotations,overlays,services';
      script.onerror = () => {
        console.warn('MapKit JS failed to load');
        resolve(null);
      };
      this.document.head.append(script);
    });
  }

  /** "11 Quillfeather Ln" at a point, if Apple has one. A failed lookup only means no prefill. */
  async address(lat: number, lng: number): Promise<string | null> {
    const mapkit = await this.load();
    if (!mapkit) return null;
    return new Promise((resolve) => {
      new mapkit.Geocoder().reverseLookup(new mapkit.Coordinate(lat, lng), (error, data) => {
        const place = error ? undefined : data.results[0];
        resolve(place?.fullThoroughfare ?? place?.name ?? null);
      });
    });
  }

  /** Apple's best match for a typed address, or null when there is none or no MapKit. */
  async search(query: string): Promise<Found | null> {
    const mapkit = await this.load();
    if (!mapkit) return null;
    return new Promise((resolve) => {
      new mapkit.Search().search(query, (error, data) => {
        const place = error ? undefined : data.places[0];
        if (!place) return resolve(null);
        const { latitude, longitude } = place.coordinate;
        resolve({
          lat: latitude,
          lng: longitude,
          address: place.fullThoroughfare ?? place.formattedAddress ?? place.name ?? null,
        });
      });
    });
  }
}
