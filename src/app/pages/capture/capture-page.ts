import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { CaptureModel, EDITABLE, LIMIT } from '../../capture/capture-model';
import { CaptureOp, text } from '../../capture/ops';
import { evidenceMarks, newLabels, summarize } from '../../capture/summary';
import { buildingAt } from '../../map/geo';
import { MapStore } from '../../map/map-store';
import { MapKit } from '../../map/mapkit';
import { LatLng, PlaceMap } from '../../map/place-map';
import { Spot } from '../../map/models';

/** Capture, from the TALK sign: type it, then check the changes and save. Leaving drops the words. */
@Component({
  selector: 'xom-capture-page',
  imports: [PlaceMap, RouterLink],
  providers: [CaptureModel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './capture-page.html',
  styleUrl: './capture-page.scss',
})
export class CapturePage {
  private readonly router = inject(Router);
  protected readonly store = inject(MapStore);
  protected readonly model = inject(CaptureModel);
  protected readonly limit = LIMIT;
  protected readonly hasMap = signal(false);

  /** The op being retyped, and the values so far. */
  protected readonly editing = signal<{ index: number; values: Record<string, string> } | null>(
    null,
  );
  /** The new house being placed, and the spot picked so far. */
  protected readonly placing = signal<{ ref: string; spot: Spot | null } | null>(null);

  protected readonly editKeys = computed(() => Object.keys(this.editing()?.values ?? {}));

  protected readonly rows = computed(() => {
    const labels = newLabels(this.model.ops());
    return this.model.ops().map((op, i) => ({
      op,
      index: i,
      summary: summarize(op, this.store.households(), labels),
      editable: EDITABLE.some((key) => text(op.fields[key]) !== null),
    }));
  });

  /** The transcript cut into plain runs and painted evidence, each tagged with its row number. */
  protected readonly said = computed(() => {
    const said = this.model.transcript();
    const parts: { text: string; number: number | null }[] = [];
    let at = 0;
    for (const mark of evidenceMarks(
      said,
      this.model.ops().map((op) => op.evidence),
    )) {
      parts.push({ text: said.slice(at, mark.start), number: null });
      parts.push({ text: said.slice(mark.start, mark.end), number: mark.number });
      at = mark.end;
    }
    return [...parts, { text: said.slice(at), number: null }];
  });

  protected readonly saveTitle = computed(() => {
    if (this.model.phase() === 'saving') return 'Saving…';
    if (this.model.unplaced().length) return 'Place the new house';
    return this.model.checked() === 1 ? 'Save 1 change' : `Save ${this.model.checked()} changes`;
  });

  constructor() {
    void this.store.ensure();
    void inject(MapKit)
      .load()
      .then((mapkit) => this.hasMap.set(mapkit !== null));
  }

  protected type(event: Event): void {
    this.model.transcript.set((event.target as HTMLTextAreaElement).value);
  }

  protected edit(op: CaptureOp, index: number): void {
    const values = Object.fromEntries(
      EDITABLE.flatMap((key) => {
        const value = text(op.fields[key]);
        return value === null ? [] : [[key, value]];
      }),
    );
    this.editing.set({ index, values });
  }

  protected retype(key: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.editing.update((e) => e && { ...e, values: { ...e.values, [key]: value } });
  }

  protected doneEditing(): void {
    const editing = this.editing();
    if (editing) this.model.edit(editing.index, editing.values);
    this.editing.set(null);
  }

  /** A tap picks the building under it, or open ground where there is none. */
  protected pick({ lat, lng }: LatLng, press = false): void {
    const building = press ? null : buildingAt(this.store.footprints(), lat, lng);
    this.placing.update((p) => p && { ...p, spot: { lat, lng, buildingId: building?.id ?? null } });
  }

  protected putHere(): void {
    const placing = this.placing();
    if (placing?.spot) this.model.place(placing.ref, placing.spot);
    this.placing.set(null);
  }

  protected async save(): Promise<void> {
    if (await this.model.apply()) void this.router.navigateByUrl('/');
  }
}
