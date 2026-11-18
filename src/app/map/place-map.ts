import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

import { plaqueElement } from '../ui/plaque';
import { Footprint, houseNumber } from './geo';
import { MapKit, MapKitJs, MkMap } from './mapkit';
import { Household, Place, Spot } from './models';

export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * The place on MapKit JS: muted base map, building outlines, a plaque per household. Taps and long-presses go
 * out as coordinates; hit-testing is MapStore's, so it stays testable without MapKit.
 */
@Component({
  selector: 'xom-place-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.unavailable]': "state() === 'unavailable'" },
  template: `
    <div #canvas class="canvas" [hidden]="state() !== 'ready'"></div>
    @switch (state()) {
      @case ('loading') {
        <p class="state muted" role="status">Loading the map…</p>
      }
      @case ('unavailable') {
        <div class="state">
          <p class="eyebrow">Map unavailable</p>
          <p class="muted">Every household is still in the list.</p>
        </div>
      }
    }
  `,
  styleUrl: './place-map.scss',
})
export class PlaceMap {
  private readonly mapkit = inject(MapKit);

  readonly place = input.required<Place>();
  readonly households = input.required<Household[]>();
  readonly footprints = input<Footprint[]>([]);
  readonly selection = input<Spot | null>(null);
  readonly open = output<string>();
  readonly tap = output<LatLng>();
  readonly press = output<LatLng>();

  protected readonly state = signal<'loading' | 'ready' | 'unavailable'>('loading');
  private readonly canvas = viewChild.required<ElementRef<HTMLElement>>('canvas');
  private readonly view = signal<{ mk: MapKitJs; map: MkMap } | null>(null);
  /** Bumped when the colour scheme flips, so outlines pick up the other palette. */
  private readonly scheme = signal(0);

  constructor() {
    afterNextRender(() => void this.create());
    inject(DestroyRef).onDestroy(() => this.view()?.map.destroy());

    effect(() => {
      const view = this.view();
      if (!view) return;
      this.scheme();
      this.drawOutlines(view, this.footprints(), this.selection()?.buildingId ?? null);
    });
    effect(() => {
      const view = this.view();
      if (view) this.drawPlaques(view, this.households(), this.selection());
    });
  }

  private async create(): Promise<void> {
    const mk = await this.mapkit.load();
    if (!mk) {
      this.state.set('unavailable');
      return;
    }
    const { center, radius_m } = this.place();
    const dark = matchMedia('(prefers-color-scheme: dark)');
    // Opens on the middle of the place, not all of it: at the full radius every plaque is a dot.
    const span = new mk.CoordinateSpan(
      radius_m / 111_320,
      radius_m / (111_320 * Math.cos((center.lat * Math.PI) / 180)),
    );
    const map = new mk.Map(this.canvas().nativeElement, {
      region: new mk.CoordinateRegion(new mk.Coordinate(center.lat, center.lng), span),
      mapType: mk.Map.MapTypes.MutedStandard,
      pointOfInterestFilter: mk.PointOfInterestFilter.excludingAllCategories,
      colorScheme: dark.matches ? mk.Map.ColorSchemes.Dark : mk.Map.ColorSchemes.Light,
      isRotationEnabled: false,
    });
    dark.addEventListener('change', () => {
      map.colorScheme = dark.matches ? mk.Map.ColorSchemes.Dark : mk.Map.ColorSchemes.Light;
      this.scheme.update((n) => n + 1);
    });
    const at = (event: { pointOnPage: DOMPoint }) => {
      const { latitude, longitude } = map.convertPointOnPageToCoordinate(event.pointOnPage);
      return { lat: latitude, lng: longitude };
    };
    map.addEventListener('single-tap', (event) => this.tap.emit(at(event)));
    map.addEventListener('long-press', (event) => this.press.emit(at(event)));
    this.view.set({ mk, map });
    this.state.set('ready');
  }

  private drawOutlines(
    { mk, map }: { mk: MapKitJs; map: MkMap },
    footprints: Footprint[],
    picked: string | null,
  ) {
    const css = getComputedStyle(this.canvas().nativeElement);
    const color = (name: string) => css.getPropertyValue(name).trim();
    const style = (footprint: Footprint) =>
      footprint.id === picked
        ? new mk.Style({
            fillColor: color('--warn'),
            fillOpacity: 0.6,
            strokeColor: color('--warn'),
            lineWidth: 2,
          })
        : new mk.Style({
            fillColor: color(footprint.accessory ? '--roof-acc' : '--roof'),
            fillOpacity: 0.9,
            strokeColor: '#000',
            strokeOpacity: 0.3,
            lineWidth: 0.5,
          });
    map.removeOverlays(map.overlays);
    map.addOverlays(
      footprints.flatMap((footprint) =>
        footprint.polygons.map(
          (rings) =>
            new mk.PolygonOverlay(
              rings.map((ring) => ring.map(([lng, lat]) => new mk.Coordinate(lat, lng))),
              { style: style(footprint), data: { id: footprint.id }, enabled: false },
            ),
        ),
      ),
    );
  }

  private drawPlaques(
    { mk, map }: { mk: MapKitJs; map: MkMap },
    households: Household[],
    spot: Spot | null,
  ) {
    map.removeAnnotations(map.annotations);
    const plaques = households.map((h) => {
      const factory = () => {
        const button = plaqueElement('button', houseNumber(h.private.address), h.private.label);
        button.addEventListener('click', () => this.open.emit(h.id));
        return button;
      };
      return new mk.Annotation(new mk.Coordinate(h.lat, h.lng), factory, {
        title: h.private.label,
        calloutEnabled: false,
      });
    });
    if (spot && !spot.buildingId) {
      const pin = () => plaqueElement('span', null, null);
      plaques.push(
        new mk.Annotation(new mk.Coordinate(spot.lat, spot.lng), pin, {
          title: 'Dropped pin',
          calloutEnabled: false,
        }),
      );
    }
    map.addAnnotations(plaques);
  }
}
