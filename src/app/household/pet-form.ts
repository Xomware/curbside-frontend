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

import { Pet } from '../map/models';
import { petCreate, petDraft, petPatch, petProblem } from './drafts';
import { HouseholdModel } from './household-model';
import { SAVE_MESSAGES } from './messages';

/** Add or edit a pet. The draft survives a 409: the card reloads beneath it and the user saves again. */
@Component({
  selector: 'xom-pet-form',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pet-form.html',
})
export class PetForm {
  private readonly model = inject(HouseholdModel);
  readonly pet = input<Pet | null>(null);
  /** Closes the form; carries what to announce. */
  readonly done = output<string>();

  protected readonly form = inject(NonNullableFormBuilder).group(petDraft());
  protected readonly busy = signal(false);
  protected readonly message = signal<string | null>(null);
  protected readonly confirming = signal(false);
  private readonly heading = viewChild.required<ElementRef<HTMLElement>>('heading');

  constructor() {
    afterNextRender(() => {
      const pet = this.pet();
      if (pet) this.form.setValue(petDraft(pet));
      this.heading().nativeElement.focus();
    });
  }

  protected async save(): Promise<void> {
    const draft = this.form.getRawValue();
    const problem = petProblem(draft);
    if (problem) return this.message.set(problem);
    // Diffed against the card's latest copy, which a 409 has just refreshed.
    const id = this.pet()?.id ?? null;
    const current = this.model.pets().find((p) => p.id === id);
    const body = current ? petPatch(current, draft) : petCreate(draft);
    if (!body) return this.done.emit('');
    this.busy.set(true);
    const result = await this.model.save('pets', current ? id : null, body);
    this.busy.set(false);
    if (result === 'saved') this.done.emit(`${draft.name.trim()} saved.`);
    else this.message.set(SAVE_MESSAGES[result]);
  }

  protected async remove(): Promise<void> {
    const pet = this.pet();
    if (!pet) return;
    this.busy.set(true);
    const gone = await this.model.remove('pets', pet.id);
    this.busy.set(false);
    if (gone) this.done.emit(`${pet.name} removed.`);
    else this.message.set(SAVE_MESSAGES.failed);
  }
}
