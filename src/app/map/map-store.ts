import { Injectable, InjectionToken, computed, inject, signal } from '@angular/core';

import { Api } from '../api/api';
import { FootprintLoader } from './footprints';
import { Footprint, buildingAt } from './geo';
import { MapKit } from './mapkit';
import { Household, Place, Spot } from './models';

/** Short address at a point, or null. MapKit's geocoder; tests swap it out. */
export const REVERSE_GEOCODE = new InjectionToken<
  (lat: number, lng: number) => Promise<string | null>
>('REVERSE_GEOCODE', {
  factory: () => {
    const mapkit = inject(MapKit);
    return (lat, lng) => mapkit.address(lat, lng);
  },
});

export interface NewPlace {
  name: string;
  center: { lat: number; lng: number };
  radius_m: number;
}

// Which of the account's streets is open, across tabs and visits. Only the id: nothing about the street itself.
const CURRENT = 'curbside.map';
// The household the walkthrough made for you, per street: the map opens on it. The API has no notion of whose
// house is whose, so this is this browser's memory only.
const HOMES = 'curbside.homes';

/** footprints_fetch runs after `POST /maps` answers; Overpass usually takes seconds, rarely a minute. */
const OUTLINE_POLL_MS = 3000;
const OUTLINE_POLLS = 20;

export type MapStatus = 'loading' | 'none' | 'ready' | 'failed';

/** The open street and its households. An account can have several (its own, and ones shared with it). */
@Injectable({ providedIn: 'root' })
export class MapStore {
  private readonly api = inject(Api);
  private readonly loader = inject(FootprintLoader);
  private readonly geocode = inject(REVERSE_GEOCODE);
  private pending: Promise<void> | null = null;
  private polling = false;
  private readonly homeIds = signal<Record<string, string>>(
    JSON.parse(localStorage.getItem(HOMES) ?? '{}'),
  );

  readonly status = signal<MapStatus>('loading');
  readonly maps = signal<Place[]>([]);
  readonly place = signal<Place | null>(null);
  readonly households = signal<Household[]>([]);
  /** Empty until the file loads, and for good when the place has none; households then stand alone as plaques. */
  readonly footprints = signal<Footprint[]>([]);
  readonly selection = signal<Spot | null>(null);
  /** Your own household on the open street, if you added it here. */
  readonly home = computed(() => {
    const id = this.homeIds()[this.place()?.id ?? ''];
    return this.households().find((h) => h.id === id) ?? null;
  });

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
      const maps = await this.api.request<Place[]>('GET', '/maps');
      this.maps.set(maps);
      const open = maps.find((m) => m.id === localStorage.getItem(CURRENT)) ?? maps[0];
      if (!open) {
        this.status.set('none');
        return;
      }
      await this.fetch(open.id);
      this.status.set('ready');
    } catch (error) {
      console.error('Map load failed', error);
      this.status.set('failed');
    }
  }

  /** Switches to another street, re-reading the list: it may have just gained a shared one or lost one. */
  async open(id: string | null): Promise<void> {
    if (id) localStorage.setItem(CURRENT, id);
    else localStorage.removeItem(CURRENT);
    this.selection.set(null);
    this.footprints.set([]);
    this.pending = this.load();
    await this.pending;
    if (this.status() === 'ready') void this.loadFootprints();
  }

  /** Makes the account's place, then polls until its outlines are fetched. Plaques work in the meantime. */
  async createPlace(body: NewPlace): Promise<void> {
    const created = await this.api.request<Place>('POST', '/maps', body);
    localStorage.setItem(CURRENT, created.id);
    this.maps.update((maps) => [...maps, created]);
    this.place.set(created);
    this.households.set([]);
    this.footprints.set([]);
    this.pending = Promise.resolve();
    this.status.set('ready');
    void this.awaitOutlines();
  }

  /** Polls the open street until the server has fetched its outlines, then draws them. One poll at a time. */
  async awaitOutlines(): Promise<void> {
    if (this.polling) return;
    this.polling = true;
    try {
      for (let poll = 0; poll < OUTLINE_POLLS; poll++) {
        await new Promise((resolve) => setTimeout(resolve, OUTLINE_POLL_MS));
        const place = this.place();
        if (!place) return;
        await this.fetch(place.id);
        if (this.place()?.footprint.status !== 'pending') break;
      }
    } catch (error) {
      // The next page load picks the outlines up.
      console.warn('Outline poll failed', error);
      return;
    } finally {
      this.polling = false;
    }
    await this.loadFootprints();
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

  /** Adds a household at a picked building or dropped pin. */
  async create(spot: Spot, label: string, address: string | null): Promise<Household> {
    const body = {
      label,
      lat: spot.lat,
      lng: spot.lng,
      ...(address ? { address } : {}),
      ...(spot.buildingId ? { building_id: spot.buildingId } : {}),
    };
    const created = await this.api.request<Household>(
      'POST',
      `/maps/${this.place()?.id}/households`,
      body,
    );
    this.upsert(created);
    this.selection.set(null);
    return created;
  }

  setHome(id: string): void {
    const place = this.place();
    if (!place) return;
    this.homeIds.update((ids) => ({ ...ids, [place.id]: id }));
    localStorage.setItem(HOMES, JSON.stringify(this.homeIds()));
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

  /**
   * A tap selects the building under it. Anywhere else, sheds included, drops a pin: on a fresh street there are
   * no outlines yet, and a tap that did nothing read as a broken map.
   */
  tap(lat: number, lng: number): Promise<void> {
    const building = buildingAt(this.footprints(), lat, lng);
    return this.select({ lat, lng, buildingId: building?.id ?? null });
  }

  /** The long-press alias for a pin. */
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
