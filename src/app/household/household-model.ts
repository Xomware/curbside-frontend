import { Injectable, computed, inject, signal } from '@angular/core';

import { Api, ApiError } from '../api/api';
import { MapStore } from '../map/map-store';
import { Household, Person, Pet } from '../map/models';
import { Body } from './drafts';

interface Children {
  people: Person;
  pets: Pet;
}

/** `conflict`: someone else changed it first. The card now shows their copy; the form keeps the user's draft. */
export type SaveResult = 'saved' | 'conflict' | 'failed';

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

  /** Creates a person or pet (no `id`), or PATCHes one. A 409 reloads the household. */
  async save<K extends keyof Children>(
    kind: K,
    id: string | null,
    body: Body,
  ): Promise<SaveResult> {
    try {
      const path = id ? `${this.path}/${kind}/${id}` : `${this.path}/${kind}`;
      const child = await this.api.request<Children[K]>(id ? 'PATCH' : 'POST', path, body);
      this.edit(kind, (list) =>
        id ? list.map((c) => (c.id === id ? child : c)) : [...list, child],
      );
      return 'saved';
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 409) return 'failed';
      await this.load();
      return 'conflict';
    }
  }

  /** True once it's gone, including when someone else already deleted it (404). */
  async remove<K extends keyof Children>(kind: K, id: string): Promise<boolean> {
    try {
      await this.api.request('DELETE', `${this.path}/${kind}/${id}`);
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 404) return false;
    }
    this.edit(kind, (list) => list.filter((c) => c.id !== id));
    return true;
  }

  private edit<K extends keyof Children>(
    kind: K,
    change: (list: Children[K][]) => Children[K][],
  ): void {
    const household = this.household();
    if (!household) return;
    const list = (household.private[kind] ?? []) as Children[K][];
    this.changed({ ...household, private: { ...household.private, [kind]: change(list) } });
  }

  /** Keeps the card and the map's plaques on the same copy. */
  protected changed(household: Household): void {
    this.household.set(household);
    this.store.upsert(household);
  }
}
