import { Injectable, computed, inject, signal } from '@angular/core';

import { Api, ApiError } from '../api/api';
import { nearest } from '../map/geo';
import { MapStore } from '../map/map-store';
import { Spot } from '../map/models';
import { CaptureOp, FieldValue, Parsed, isNew, text } from './ops';

export const LIMIT = 2000;
/** Fields a person can retype on review, in form order. Numbers and flags are fixed on the card instead. */
export const EDITABLE = ['label', 'address', 'name', 'species', 'birthday', 'notes', 'text'];
/** Blank would fail apply's validation, so these keep their old value instead. */
const REQUIRED = new Set(['label', 'name', 'text']);

/**
 * Type → parse → the user checks the proposed changes → apply. The transcript lives only here, in memory: never
 * stored, gone with the page.
 */
@Injectable()
export class CaptureModel {
  private readonly api = inject(Api);
  private readonly store = inject(MapStore);
  /** What was picked on the map before TALK. Its first household is the one being talked about. */
  private readonly spot = this.store.selection();
  readonly focus = this.store.selected()[0] ?? null;

  readonly transcript = signal('');
  readonly phase = signal<'input' | 'parsing' | 'review' | 'saving'>('input');
  readonly message = signal<string | null>(null);
  readonly ops = signal<CaptureOp[]>([]);
  readonly unresolved = signal<string[]>([]);
  /** Where each "new:N" goes on the map. The parse only knows a label and maybe an address. */
  readonly placements = signal<Record<string, Spot>>({});
  private baseVersions: Record<string, number> = {};

  readonly checked = computed(() => this.ops().filter((op) => op.checked).length);
  /** New houses kept but not on the map yet. Apply needs their lat/lng. */
  readonly unplaced = computed(() =>
    this.ops()
      .filter(
        (op) => op.checked && op.op === 'create_household' && !this.placements()[op.household_ref],
      )
      .map((op) => op.household_ref),
  );
  readonly canSave = computed(
    () => this.phase() === 'review' && this.checked() > 0 && this.unplaced().length === 0,
  );

  /** The households the model may write to: up to 8 nearest the pick, else the place's centre. */
  roster(): string[] {
    const place = this.store.place();
    const here = this.spot ?? place?.center;
    if (!here) return [];
    const others = this.store.households().filter((h) => h.id !== this.focus?.id);
    return nearest(others, here, 8).map((h) => h.id);
  }

  async parse(): Promise<void> {
    const transcript = this.transcript().trim();
    if (!transcript || transcript.length > LIMIT) return;
    this.phase.set('parsing');
    this.message.set(null);
    try {
      const parsed = await this.api.request<Parsed>(
        'POST',
        `/maps/${this.store.place()?.id}/capture/parse`,
        {
          transcript,
          source: 'text',
          ...(this.focus ? { focus_household_id: this.focus.id } : {}),
          nearby_household_ids: this.roster(),
        },
      );
      this.ops.set(parsed.operations);
      this.unresolved.set(parsed.unresolved);
      this.baseVersions = parsed.base_versions;
      // Opened on an empty building or a dropped pin: that's where the first new house is.
      const startsPlaced =
        this.spot && !this.focus && parsed.operations.some((op) => op.household_ref === 'new:1');
      this.placements.set(startsPlaced && this.spot ? { 'new:1': this.spot } : {});
      this.phase.set('review');
    } catch (error) {
      this.phase.set('input');
      this.message.set(messageFor(error));
    }
  }

  /** A new house's changes need its create, and the create's loss takes them with it: apply 400s otherwise. */
  toggle(index: number): void {
    const target = this.ops()[index];
    const checked = !target.checked;
    this.ops.update((ops) =>
      ops.map((op, i) => {
        if (i === index) return { ...op, checked };
        if (!isNew(target) || op.household_ref !== target.household_ref) return op;
        if (target.op === 'create_household' && !checked) return { ...op, checked: false };
        if (target.op !== 'create_household' && checked && op.op === 'create_household')
          return { ...op, checked: true };
        return op;
      }),
    );
  }

  /** The op's text fields, retyped. Only fields it already has; optional ones left blank are dropped. */
  edit(index: number, values: Record<string, string>): void {
    this.ops.update((ops) =>
      ops.map((op, i) => {
        if (i !== index) return op;
        const fields: Record<string, FieldValue> = { ...op.fields };
        for (const [key, raw] of Object.entries(values)) {
          if (!EDITABLE.includes(key) || text(op.fields[key]) === null) continue;
          const value = raw.trim();
          if (!value && REQUIRED.has(key)) continue;
          if (value) fields[key] = value;
          else delete fields[key];
        }
        return { ...op, fields };
      }),
    );
  }

  place(ref: string, spot: Spot): void {
    this.placements.update((all) => ({ ...all, [ref]: spot }));
  }

  /** Back to the words, to say more or fix them. */
  revise(): void {
    this.phase.set('input');
    this.message.set(null);
  }

  /** Checked ops, creates first: the model sometimes names a new house's people before the house. */
  applyBody() {
    const kept = this.ops()
      .filter((op) => op.checked)
      .map(({ op, household_ref, target_id, fields }) => {
        const spot = this.placements()[household_ref];
        if (op !== 'create_household' || !spot) return { op, household_ref, target_id, fields };
        const placed: Record<string, FieldValue> = { ...fields, lat: spot.lat, lng: spot.lng };
        if (spot.buildingId) placed['building_id'] = spot.buildingId;
        if (!fields['address'] && spot.address) placed['address'] = spot.address;
        return { op, household_ref, target_id, fields: placed };
      });
    return {
      operations: [
        ...kept.filter((o) => o.op === 'create_household'),
        ...kept.filter((o) => o.op !== 'create_household'),
      ],
      base_versions: this.baseVersions,
      source: 'text',
    };
  }

  /** True once saved. A 409 means the houses moved under the parse, so it parses again for a fresh diff. */
  async apply(): Promise<boolean> {
    if (!this.canSave()) return false;
    this.phase.set('saving');
    this.message.set(null);
    try {
      await this.api.request(
        'POST',
        `/maps/${this.store.place()?.id}/capture/apply`,
        this.applyBody(),
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        await this.parse();
        if (this.phase() === 'review')
          this.message.set(
            "Something changed on these houses since. Here's a fresh read; check it again.",
          );
      } else {
        this.phase.set('review');
        this.message.set(messageFor(error));
      }
      return false;
    }
    this.transcript.set('');
    this.ops.set([]);
    // Apply answers with ids only, so the map is the cheapest complete copy. A failed refresh leaves the old
    // plaques until the next load; the capture itself already saved.
    await this.store
      .refresh()
      .catch((error) => console.warn('Map refresh after capture failed', error));
    return true;
  }
}

export function messageFor(error: unknown): string {
  if (!(error instanceof ApiError)) return "Couldn't reach Curbside. Try again.";
  switch (error.status) {
    case 429:
      return "That's today's 50 captures. Add this on the card instead, or try again tomorrow.";
    case 502:
      return "Couldn't make sense of that. Try saying it another way.";
    case 503:
      return 'Reading is down for a moment. Try again shortly.';
    case 413:
      return 'Too many changes at once. Uncheck some and save again.';
    default:
      return "Couldn't reach Curbside. Try again.";
  }
}
