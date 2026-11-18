import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';

import { Person } from '../map/models';
import { personCreate, personDraft, personPatch, personProblem } from './drafts';
import { HouseholdModel } from './household-model';
import { SAVE_MESSAGES } from './messages';

/** Add or edit an adult or kid. The draft survives a 409: the card reloads beneath it and the user saves again. */
@Component({
  selector: 'xom-person-form',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './person-form.html',
})
export class PersonForm {
  private readonly model = inject(HouseholdModel);
  readonly person = input<Person | null>(null);
  /** Closes the form; carries what to announce. */
  readonly done = output<string>();

  protected readonly form = inject(NonNullableFormBuilder).group(personDraft());
  protected readonly busy = signal(false);
  protected readonly message = signal<string | null>(null);
  protected readonly confirming = signal(false);
  private readonly heading = viewChild.required<ElementRef<HTMLElement>>('heading');

  constructor() {
    afterNextRender(() => {
      const person = this.person();
      if (person) this.form.setValue(personDraft(person));
      this.heading().nativeElement.focus();
    });
  }

  protected async save(): Promise<void> {
    const draft = this.form.getRawValue();
    const problem = personProblem(draft);
    if (problem) return this.message.set(problem);
    // Diffed against the card's latest copy, which a 409 has just refreshed.
    const id = this.person()?.id ?? null;
    const current = this.model.people().find((p) => p.id === id);
    const body = current ? personPatch(current, draft) : personCreate(draft);
    if (!body) return this.done.emit('');
    this.busy.set(true);
    const result = await this.model.save('people', current ? id : null, body);
    this.busy.set(false);
    if (result === 'saved') this.done.emit(`${draft.name.trim()} saved.`);
    else this.message.set(SAVE_MESSAGES[result]);
  }

  protected async remove(): Promise<void> {
    const person = this.person();
    if (!person) return;
    this.busy.set(true);
    const gone = await this.model.remove('people', person.id);
    this.busy.set(false);
    if (gone) this.done.emit(`${person.name} removed.`);
    else this.message.set(SAVE_MESSAGES.failed);
  }
}
