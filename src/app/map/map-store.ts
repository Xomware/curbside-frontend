import { Injectable, InjectionToken, computed, inject, signal } from '@angular/core';

import { Api } from '../api/api';
import { FootprintLoader } from './footprints';
import { Footprint, buildingAt } from './geo';
import { Household, Place, Spot } from './models';

/** Short address at a point, or null. MapKit's geocoder once the map loads; nothing without it. */
export const REVERSE_GEOCODE = new InjectionToken<
  (lat: number, lng: number) => Promise<string | null>
>('REVERSE_GEOCODE', { factory: () => async () => null });

export type MapStatus = 'loading' | 'none' | 'ready' | 'failed';

/** The account's place and its households. MVP has one place per account: the first map in `GET /maps`. */
@Injectable({ providedIn: 'root' })
export class MapStore {
  private readonly api = inject(Api);
  private readonly loader = inject(FootprintLoader);
  private readonly geocode = inject(REVERSE_GEOCODE);
  private pending: Promise<void> | null = null;

  readonly status = signal<MapStatus>('loading');
  readonly place = signal<Place | null>(null);
  readonly households = signal<Household[]>([]);
  /** Empty until the file loads, and for good when the place has none; households then stand alone as plaques. */
  readonly footprints = signal<Footprint[]>([]);
  readonly selection = signal<Spot | null>(null);

  /** Households in the selected building. Duplexes and apartments put several in one outline. */
  readonly selected = computed(() => {
    const id = this.selection()?.buildingId;
    return id ? this.households().filter((h) => h.building_id === id) : [];
  });

  /** Loads once per tab; a failed load runs again. Cards keep the copy current through `upsert`. */
  ensure(): Promise<void> {
    if (!this.pending || this.status() === 'failed') this.pending = this.load();
    return this.pending;
  }

  private async load(): Promise<void> {
    this.status.set('loading');
    try {
      const [first] = await this.api.request<Place[]>('GET', '/maps');
      if (!first) {
        this.status.set('none');
        return;
      }
      await this.fetch(first.id);
      this.status.set('ready');
    } catch (error) {
      console.error('Map load failed', error);
      this.status.set('failed');
    }
  }

  /** Picks up what a capture wrote. Apply answers with ids only, so the map is the cheapest complete copy. */
  async refresh(): Promise<void> {
    const place = this.place();
    if (!place) return;
    await this.fetch(place.id);
    this.selection.set(null);
  }

  private async fetch(id: string): Promise<void> {
    const loaded = await this.api.request<{ map: Place; households: Household[] }>(
      'GET',
      `/maps/${id}`,
    );
    this.place.set(loaded.map);
    this.households.set(loaded.households);
  }

  async loadFootprints(): Promise<void> {
    const place = this.place();
    if (!place) return;
    try {
      this.footprints.set(await this.loader.load(place));
    } catch (error) {
      // Plaques without outlines is the designed fallback; the next page load tries again.
      console.warn('Footprints unavailable', error);
      this.footprints.set([]);
    }
  }

  household(id: string): Household | undefined {
    return this.households().find((h) => h.id === id);
  }

  upsert(household: Household): void {
    this.households.update((all) =>
      all.some((h) => h.id === household.id)
        ? all.map((h) => (h.id === household.id ? household : h))
        : [...all, household],
    );
  }

  /** A tap selects the building under it; accessory buildings and open ground clear the selection. */
  tap(lat: number, lng: number): Promise<void> {
    const building = buildingAt(this.footprints(), lat, lng);
    if (!building) {
      this.selection.set(null);
      return Promise.resolve();
    }
    return this.select({ lat, lng, buildingId: building.id });
  }

  /** A long-press drops a pin anywhere: the fallback for houses with no outline. */
  drop(lat: number, lng: number): Promise<void> {
    return this.select({ lat, lng, buildingId: null });
  }

  private async select(spot: Spot): Promise<void> {
    this.selection.set(spot);
    const address = await this.geocode(spot.lat, spot.lng);
    // A newer tap may have landed while Apple answered.
    if (this.selection() === spot) this.selection.set({ ...spot, address });
  }
}
