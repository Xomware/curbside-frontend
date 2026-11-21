import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { HouseholdModel } from '../household/household-model';
import { SAVE_MESSAGES } from '../household/messages';

/** "Who lives with you?" Names only, one at a time; birthdays and the rest wait for the household card. */
@Component({
  selector: 'xom-people-step',
  imports: [ReactiveFormsModule],
  providers: [HouseholdModel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="lead">Who lives with you?</p>
    <p>Add the people and pets in your house. Neighbors on your street will see them.</p>

    @if (model.missing() || model.failed()) {
      <p class="notice" role="alert">Couldn't open your household. You can add people later.</p>
    } @else {
      <form class="editor" [formGroup]="form" (ngSubmit)="add()">
        <div class="field">
          <label for="member-name">Name</label>
          <input #name id="member-name" formControlName="name" maxlength="80" autocomplete="off" />
        </div>
        <fieldset class="choice">
          <legend>Who</legend>
          <label><input type="radio" formControlName="kind" value="adult" /> Adult</label>
          <label><input type="radio" formControlName="kind" value="kid" /> Kid</label>
          <label><input type="radio" formControlName="kind" value="pet" /> Pet</label>
        </fieldset>
        @if (message(); as text) {
          <p class="notice" role="alert">{{ text }}</p>
        }
        <button
          class="btn"
          type="submit"
          [disabled]="form.invalid || busy() || !model.household() || model.loading()"
        >
          {{ busy() ? 'Adding…' : 'Add' }}
        </button>
      </form>
    }

    <ul class="added" aria-label="In your house">
      @for (member of added(); track member.id) {
        <li>
          {{ member.name }} <span class="eyebrow">{{ member.kind }}</span>
        </li>
      }
    </ul>
    <p class="sr-only" aria-live="polite">{{ announce() }}</p>

    <button
      class="btn"
      [class.btn--green]="added().length"
      type="button"
      [disabled]="busy()"
      (click)="done.emit()"
    >
      {{ added().length ? 'Next' : 'Skip for now' }}
    </button>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    .added {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      margin: 0;
      padding: 0;
      list-style: none;

      &:empty {
        display: none;
      }

      li {
        display: inline-flex;
        align-items: baseline;
        gap: var(--space-2);
        padding: 7px 10px 5px;
        border-radius: 6px;
        background: var(--surface);
        font-weight: 700;
        box-shadow: inset 0 0 0 1.5px var(--rule);
      }
    }
  `,
})
export class PeopleStep implements OnInit {
  protected readonly model = inject(HouseholdModel);
  readonly household = input.required<string>();
  readonly done = output();

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(80)]],
    kind: ['adult' as 'adult' | 'kid' | 'pet'],
  });
  protected readonly busy = signal(false);
  protected readonly message = signal<string | null>(null);
  protected readonly announce = signal('');
  protected readonly added = computed(() => [
    ...this.model.people().map((p) => ({ id: p.id, name: p.name, kind: p.role })),
    ...this.model.pets().map((p) => ({ id: p.id, name: p.name, kind: 'pet' })),
  ]);
  private readonly name = viewChild<ElementRef<HTMLInputElement>>('name');

  ngOnInit(): void {
    void this.model.open(this.household());
  }

  protected async add(): Promise<void> {
    const { kind } = this.form.getRawValue();
    const name = this.form.controls.name.value.trim();
    this.busy.set(true);
    this.message.set(null);
    const result =
      kind === 'pet'
        ? await this.model.save('pets', null, { name })
        : await this.model.save('people', null, { name, role: kind });
    this.busy.set(false);
    if (result !== 'saved') {
      this.message.set(SAVE_MESSAGES[result]);
      return;
    }
    this.announce.set(`${name} added.`);
    this.form.controls.name.reset();
    this.name()?.nativeElement.focus();
  }
}
