import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { AccountStore } from '../account/account-store';
import { houseNumber } from '../map/geo';
import { MapStore } from '../map/map-store';
import { Found, MapKit, MapKitJs, MkMap } from '../map/mapkit';
import { street } from '../map/place-setup';
import { plaqueElement } from '../ui/plaque';

const RADIUS_M = 300;
const METERS_PER_DEGREE = 111_320;

/**
 * "Where do you live?" With no street yet, it makes one around your home and puts your household on it. With a
 * street already (you joined by invite), it offers to add your household there, skippable. Emits the new
 * household's id, or null when skipped.
 */
@Component({
  selector: 'xom-home-step',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home-step.html',
  styleUrl: './home-step.scss',
})
export class HomeStep {
  private readonly mapkit = inject(MapKit);
  private readonly account = inject(AccountStore);
  protected readonly store = inject(MapStore);
  readonly done = output<string | null>();

  protected readonly form = inject(NonNullableFormBuilder).group({
    query: [''],
    label: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(80)]],
    street: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(80)]],
  });
  /** `new` makes a street; `join` adds your house to the one you're on. */
  protected readonly mode = signal<'loading' | 'new' | 'join' | 'failed'>('loading');
  protected readonly found = signal<Found | null>(null);
  protected readonly busy = signal(false);
  protected readonly message = signal<string | null>(null);
  protected readonly preview = signal<'loading' | 'ready' | 'none'>('loading');
  private readonly label = toSignal(this.form.controls.label.valueChanges, { initialValue: '' });
  private readonly canvas = viewChild.required<ElementRef<HTMLElement>>('canvas');
  private readonly view = signal<{ mk: MapKitJs; map: MkMap } | null>(null);

  constructor() {
    afterNextRender(() => void this.createPreview());
    inject(DestroyRef).onDestroy(() => this.view()?.map.destroy());
    effect(() => {
      const view = this.view();
      if (!view) return;
      const found = this.found();
      const place = this.store.place();
      if (found) this.drawHome(view, found, this.label(), this.mode() === 'new');
      // Joining: the street you're joining until you pick your house on it.
      else if (this.mode() === 'join' && place) {
        view.map.region = around(view.mk, place.center.lat, place.center.lng, place.radius_m * 2.6);
      }
    });
    void this.load();
  }

  protected async load(): Promise<void> {
    this.mode.set('loading');
    if (!this.account.account()) await this.account.load();
    await this.store.ensure();
    if (this.store.status() === 'failed') {
      this.mode.set('failed');
      return;
    }
    const name = this.account.account()?.display_name;
    const label = this.form.controls.label;
    if (name && !label.value) label.setValue(`${name}'s`);
    this.setMode(this.store.place() ? 'join' : 'new');
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

  protected async save(): Promise<void> {
    const at = this.found();
    if (!at || this.form.invalid) return;
    const { label, street } = this.form.getRawValue();
    this.busy.set(true);
    this.message.set(null);
    try {
      if (this.mode() === 'new') {
        const center = { lat: at.lat, lng: at.lng };
        await this.store.createPlace({ name: street.trim(), center, radius_m: RADIUS_M });
        // The street exists now: a retry after a failed household only adds the household.
        this.setMode('join');
      }
      const home = await this.store.create(
        { lat: at.lat, lng: at.lng, buildingId: null },
        label.trim(),
        at.address,
      );
      this.store.setHome(home.id);
      this.done.emit(home.id);
    } catch (error) {
      console.error('Home setup failed', error);
      this.message.set("Couldn't save your home. Try again.");
    } finally {
      this.busy.set(false);
    }
  }

  private setMode(mode: 'new' | 'join'): void {
    this.mode.set(mode);
    // Disabled controls drop out of validation: a joined street already has its name.
    if (mode === 'join') this.form.controls.street.disable();
  }

  private async pick(find: () => Promise<Found>): Promise<void> {
    this.busy.set(true);
    this.message.set(null);
    try {
      const found = await find();
      this.found.set(found);
      const name = this.form.controls.street;
      if (found.address && !name.value.trim()) name.setValue(street(found.address));
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
      // The lower 48 until there is a home.
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

  private drawHome(
    { mk, map }: { mk: MapKitJs; map: MkMap },
    at: Found,
    label: string,
    street: boolean,
  ): void {
    const center = new mk.Coordinate(at.lat, at.lng);
    // The whole street when one is being made, the block around the house when joining one.
    map.region = around(mk, at.lat, at.lng, street ? RADIUS_M * 2.6 : 220);
    map.removeOverlays(map.overlays);
    if (street) {
      const green = getComputedStyle(this.canvas().nativeElement).getPropertyValue('--green');
      const style = { strokeColor: green.trim(), lineWidth: 2, fillColor: green.trim() };
      map.addOverlays([
        new mk.CircleOverlay(center, RADIUS_M, {
          style: new mk.Style({ ...style, fillOpacity: 0.12 }),
        }),
      ]);
    }
    map.removeAnnotations(map.annotations);
    const plaque = () => plaqueElement('span', houseNumber(at.address), label.trim() || null);
    map.addAnnotations([
      new mk.Annotation(center, plaque, { title: 'Your home', calloutEnabled: false }),
    ]);
  }
}

function around(mk: MapKitJs, lat: number, lng: number, meters: number) {
  const reach = meters / METERS_PER_DEGREE;
  return new mk.CoordinateRegion(
    new mk.Coordinate(lat, lng),
    new mk.CoordinateSpan(reach, reach / Math.cos((lat * Math.PI) / 180)),
  );
}
