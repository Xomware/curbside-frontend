import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { MapStore } from './map-store';
import { Spot } from './models';

/** Name a household at the picked spot, address prefilled from Apple's lookup, then open its card. */
@Component({
  selector: 'xom-new-household',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="editor" [formGroup]="form" (ngSubmit)="save()">
      <h3 #heading class="eyebrow" tabindex="-1">Add a household</h3>
      <div class="field">
        <label for="hh-label">Name on the sign</label>
        <input id="hh-label" formControlName="label" maxlength="80" autocomplete="off" />
      </div>
      <div class="field">
        <label for="hh-address">Address</label>
        <input id="hh-address" formControlName="address" maxlength="200" autocomplete="off" />
      </div>
      @if (failed()) {
        <p class="notice" role="alert">Couldn't add the household. Try again.</p>
      }
      <button class="btn btn--green" type="submit" [disabled]="form.invalid || busy()">
        {{ busy() ? 'Adding…' : 'Add' }}
      </button>
      <div class="editor__more">
        <button class="btn-text" type="button" [disabled]="busy()" (click)="cancel.emit()">
          Cancel
        </button>
      </div>
    </form>
  `,
})
export class NewHousehold {
  private readonly store = inject(MapStore);
  private readonly router = inject(Router);
  readonly spot = input.required<Spot>();
  readonly cancel = output();

  protected readonly form = inject(NonNullableFormBuilder).group({
    label: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(80)]],
    address: ['', Validators.maxLength(200)],
  });
  protected readonly busy = signal(false);
  protected readonly failed = signal(false);
  private readonly heading = viewChild.required<ElementRef<HTMLElement>>('heading');

  constructor() {
    afterNextRender(() => this.heading().nativeElement.focus());
    // Apple's lookup can answer after the form opens; it fills the field only if the user hasn't typed.
    effect(() => {
      const address = this.spot().address;
      const field = this.form.controls.address;
      if (address && field.pristine) field.setValue(address);
    });
  }

  protected async save(): Promise<void> {
    const { label, address } = this.form.getRawValue();
    this.busy.set(true);
    this.failed.set(false);
    try {
      const created = await this.store.create(this.spot(), label.trim(), address.trim() || null);
      void this.router.navigate(['/households', created.id]);
    } catch {
      this.failed.set(true);
    } finally {
      this.busy.set(false);
    }
  }
}
