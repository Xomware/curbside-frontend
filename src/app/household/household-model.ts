import { Injectable, computed, inject, signal } from '@angular/core';

import { Api, ApiError } from '../api/api';
import { MapStore } from '../map/map-store';
import { Household } from '../map/models';

/** One household's card. Shows the map's copy straight away, then fetches the full record for notes. */
@Injectable()
export class HouseholdModel {
  protected readonly api = inject(Api);
  readonly store = inject(MapStore);

  readonly household = signal<Household | null>(null);
  readonly loading = signal(false);
  readonly failed = signal(false);
  readonly missing = signal(false);

  readonly people = computed(() => this.household()?.private.people ?? []);
  readonly adults = computed(() => this.people().filter((p) => p.role === 'adult'));
  readonly kids = computed(() => this.people().filter((p) => p.role === 'kid'));
  readonly pets = computed(() => this.household()?.private.pets ?? []);
  /** Undefined until fetched, so "no notes yet" is distinguishable from "not loaded". */
  readonly notes = computed(() => this.household()?.private.notes);

  protected get path(): string {
    const household = this.household();
    return `/maps/${this.store.place()?.id}/households/${household?.id}`;
  }

  async open(id: string): Promise<void> {
    await this.store.ensure();
    const household = this.store.household(id);
    if (!household) {
      this.missing.set(true);
      return;
    }
    this.household.set(household);
    await this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.changed(await this.api.request<Household>('GET', this.path));
      this.failed.set(false);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'household_not_found') this.missing.set(true);
      else this.failed.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  /** Keeps the card and the map's plaques on the same copy. */
  protected changed(household: Household): void {
    this.household.set(household);
    this.store.upsert(household);
  }
}
