import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { houseNumber } from '../../map/geo';
import { MapStore } from '../../map/map-store';
import { NewHousehold } from '../../map/new-household';
import { LatLng, PlaceMap } from '../../map/place-map';
import { Household } from '../../map/models';
import { Plaque } from '../../ui/plaque';
import { TalkSign } from '../../ui/talk-sign';

/** The block: the place's street sign, the map, and every household as a plaque. The list works without the map. */
@Component({
  selector: 'xom-map-page',
  imports: [NewHousehold, PlaceMap, Plaque, RouterLink, TalkSign],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './map-page.html',
  styleUrl: './map-page.scss',
})
export class MapPage {
  private readonly router = inject(Router);
  protected readonly store = inject(MapStore);
  protected readonly number = (h: Household) => houseNumber(h.private.address);
  protected readonly adding = signal(false);
  /** Changes with a new pick, not when the address lands on the current one. */
  private readonly spotKey = computed(() => {
    const spot = this.store.selection();
    return spot ? `${spot.lat},${spot.lng}` : '';
  });

  /** By house number, then label: the order you'd walk the street in. */
  protected readonly sorted = computed(() =>
    [...this.store.households()].sort(
      (a, b) =>
        (parseInt(a.private.address ?? '', 10) || Infinity) -
          (parseInt(b.private.address ?? '', 10) || Infinity) ||
        a.private.label.localeCompare(b.private.label),
    ),
  );

  constructor() {
    effect(() => {
      // A new pick closes the form opened for the last one.
      this.spotKey();
      this.adding.set(false);
    });
    void this.store.ensure().then(() => {
      if (this.store.footprints().length === 0) void this.store.loadFootprints();
    });
  }

  protected open(id: string): void {
    void this.router.navigate(['/households', id]);
  }

  protected tap({ lat, lng }: LatLng): void {
    void this.store.tap(lat, lng);
  }

  protected press({ lat, lng }: LatLng): void {
    void this.store.drop(lat, lng);
  }
}
