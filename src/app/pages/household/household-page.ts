import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { age, born, noteDate, talked, talkedToday } from '../../household/format';
import { HouseholdModel } from '../../household/household-model';
import { SAVE_MESSAGES } from '../../household/messages';
import { NoteForm } from '../../household/note-form';
import { PersonContact } from '../../household/person-contact';
import { PersonForm } from '../../household/person-form';
import { PetForm } from '../../household/pet-form';
import { SectionSign } from '../../household/section-sign';
import { Person, Pet } from '../../map/models';
import { Loading } from '../../ui/loading';

/** The household card: who lives here, their kids and pets, and what you've noted. */
@Component({
  selector: 'xom-household-page',
  imports: [Loading, NoteForm, PersonContact, PersonForm, PetForm, RouterLink, SectionSign],
  providers: [HouseholdModel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './household-page.html',
  styleUrl: './household-page.scss',
})
export class HouseholdPage {
  protected readonly model = inject(HouseholdModel);
  protected readonly age = age;
  protected readonly talked = talked;
  protected readonly noteDate = noteDate;
  protected readonly talkedToday = talkedToday;
  /** The open form, standing in for the sections. `item` null adds a new one. */
  protected readonly editing = signal<
    | { kind: 'person'; item: Person | null }
    | { kind: 'pet'; item: Pet | null }
    | { kind: 'note' }
    | null
  >(null);
  protected readonly status = signal('');
  /** A card-level problem: a failed talked-today or note delete. Form problems stay in the form. */
  protected readonly problem = signal<string | null>(null);
  /** The note waiting on its confirming second click. */
  protected readonly deleting = signal<string | null>(null);
  private readonly title = viewChild<ElementRef<HTMLElement>>('title');
  private readonly injector = inject(Injector);

  constructor() {
    void this.model.open(inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '');
  }

  protected close(status: string): void {
    this.editing.set(null);
    this.status.set(status);
    // The form held focus; hand it to the card's title rather than dropping it on the body.
    afterNextRender(() => this.title()?.nativeElement.focus(), { injector: this.injector });
  }

  protected async markTalked(): Promise<void> {
    const result = await this.model.talkedToday();
    this.problem.set(null);
    if (result === 'saved') this.status.set('Marked as talked today.');
    else if (result === 'failed') this.problem.set(SAVE_MESSAGES.failed);
    else
      this.problem.set("Someone else changed this household. Here's their version; mark it again.");
  }

  protected async deleteNote(id: string): Promise<void> {
    const gone = await this.model.remove('notes', id);
    this.deleting.set(null);
    this.problem.set(gone ? null : "Couldn't delete the note. Try again.");
    if (gone) this.status.set('Note deleted.');
  }

  protected detail(person: Person): string {
    return [born(person), person.notes].filter(Boolean).join('. ');
  }

  protected petDetail(pet: Pet): string {
    return [pet.species, pet.notes].filter(Boolean).join('. ');
  }
}
