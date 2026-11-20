import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { MapStore } from './map-store';
import { MapKit, MapKitJs, MkMap } from './mapkit';
import { LatLng } from './place-map';

const METERS_PER_DEGREE = 111_320;

/** "12 Quillfeather Ln, Springfield" → "Quillfeather Ln": the place is the street, not the house. */
export function street(address: string): string {
  return address
    .split(',')[0]
    .replace(/^\d+[A-Za-z]?\s+/, '')
    .trim();
}

/** First run: center a place on your street, choose how far it reaches, name it. Mirrors iOS PlaceSetupView. */
@Component({
  selector: 'xom-place-setup',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './place-setup.html',
  styleUrl: './place-setup.scss',
})
export class PlaceSetup {
  private readonly mapkit = inject(MapKit);
  private readonly store = inject(MapStore);

  protected readonly radii = [150, 300, 500];
  protected readonly form = inject(NonNullableFormBuilder).group({
    query: [''],
    radius: [300],
    name: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(80)]],
  });
  protected readonly center = signal<LatLng | null>(null);
  protected readonly busy = signal(false);
  protected readonly message = signal<string | null>(null);
  protected readonly preview = signal<'loading' | 'ready' | 'none'>('loading');
  private readonly radius = toSignal(this.form.controls.radius.valueChanges, {
    initialValue: 300,
  });
  private readonly canvas = viewChild.required<ElementRef<HTMLElement>>('canvas');
  private readonly view = signal<{ mk: MapKitJs; map: MkMap } | null>(null);

  constructor() {
    afterNextRender(() => void this.createPreview());
    inject(DestroyRef).onDestroy(() => this.view()?.map.destroy());
    effect(() => {
      const view = this.view();
      const center = this.center();
      if (view && center) this.drawCircle(view, center, this.radius());
    });
  }

  protected async useMyLocation(): Promise<void> {
    await this.pick(async () => {
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 15_000 }),
      );
      const { latitude: lat, longitude: lng } = position.coords;
      return { lat, lng, address: await this.mapkit.address(lat, lng) };
    });
  }

  protected async search(): Promise<void> {
    const query = this.form.controls.query.value.trim();
    if (!query) return;
    await this.pick(async () => {
      const found = await this.mapkit.search(query);
      if (!found) throw new Error('not found');
      return found;
    });
  }

  protected async create(): Promise<void> {
    const center = this.center();
    if (!center || this.form.invalid) return;
    const { name, radius } = this.form.getRawValue();
    this.busy.set(true);
    this.message.set(null);
    try {
      await this.store.createPlace({ name: name.trim(), center, radius_m: radius });
    } catch (error) {
      console.error('Place create failed', error);
      this.message.set("Couldn't make the map. Try again.");
    } finally {
      this.busy.set(false);
    }
  }

  private async pick(
    find: () => Promise<{ lat: number; lng: number; address: string | null }>,
  ): Promise<void> {
    this.busy.set(true);
    this.message.set(null);
    try {
      const { lat, lng, address } = await find();
      this.center.set({ lat, lng });
      const name = this.form.controls.name;
      if (address && !name.value.trim()) name.setValue(street(address));
    } catch (error) {
      this.message.set(
        error instanceof GeolocationPositionError && error.code === error.PERMISSION_DENIED
          ? 'Location is off for this site. Search for your address instead.'
          : 'No match for that. Try the full address.',
      );
    } finally {
      this.busy.set(false);
    }
  }

  private async createPreview(): Promise<void> {
    const mk = await this.mapkit.load();
    if (!mk) {
      this.preview.set('none');
      return;
    }
    const dark = matchMedia('(prefers-color-scheme: dark)').matches;
    const map = new mk.Map(this.canvas().nativeElement, {
      // The lower 48 until there is a center, like the iOS preview's .automatic.
      region: new mk.CoordinateRegion(
        new mk.Coordinate(39.5, -98.35),
        new mk.CoordinateSpan(25, 60),
      ),
      mapType: mk.Map.MapTypes.MutedStandard,
      pointOfInterestFilter: mk.PointOfInterestFilter.excludingAllCategories,
      colorScheme: dark ? mk.Map.ColorSchemes.Dark : mk.Map.ColorSchemes.Light,
      isRotationEnabled: false,
      isScrollEnabled: false,
      isZoomEnabled: false,
    });
    this.view.set({ mk, map });
    this.preview.set('ready');
  }

  private drawCircle({ mk, map }: { mk: MapKitJs; map: MkMap }, at: LatLng, radius: number) {
    const green = getComputedStyle(this.canvas().nativeElement).getPropertyValue('--green').trim();
    const center = new mk.Coordinate(at.lat, at.lng);
    const reach = (radius * 2.6) / METERS_PER_DEGREE;
    map.region = new mk.CoordinateRegion(
      center,
      new mk.CoordinateSpan(reach, reach / Math.cos((at.lat * Math.PI) / 180)),
    );
    map.removeOverlays(map.overlays);
    map.addOverlays([
      new mk.CircleOverlay(center, radius, {
        style: new mk.Style({
          strokeColor: green,
          lineWidth: 2,
          fillColor: green,
          fillOpacity: 0.15,
        }),
      }),
    ]);
  }
}
