import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { houseNumber } from '../../map/geo';
import { MapStore } from '../../map/map-store';
import { LatLng, PlaceMap } from '../../map/place-map';
import { Household } from '../../map/models';
import { Plaque } from '../../ui/plaque';

/** The block: the place's street sign, the map, and every household as a plaque. The list works without the map. */
@Component({
  selector: 'xom-map-page',
  imports: [PlaceMap, Plaque, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './map-page.html',
  styleUrl: './map-page.scss',
})
export class MapPage {
  private readonly router = inject(Router);
  protected readonly store = inject(MapStore);
  protected readonly number = (h: Household) => houseNumber(h.private.address);

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
