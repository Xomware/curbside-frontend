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

import { age, born, noteDate, talked } from '../../household/format';
import { HouseholdModel } from '../../household/household-model';
import { PersonForm } from '../../household/person-form';
import { PetForm } from '../../household/pet-form';
import { SectionSign } from '../../household/section-sign';
import { Person, Pet } from '../../map/models';

/** The household card: who lives here, their kids and pets, and what you've noted. */
@Component({
  selector: 'xom-household-page',
  imports: [PersonForm, PetForm, RouterLink, SectionSign],
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
  /** The open form, standing in for the sections. `item` null adds a new one. */
  protected readonly editing = signal<
    { kind: 'person'; item: Person | null } | { kind: 'pet'; item: Pet | null } | null
  >(null);
  protected readonly status = signal('');
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

  protected detail(person: Person): string {
    return [born(person), person.notes].filter(Boolean).join('. ');
  }

  protected petDetail(pet: Pet): string {
    return [pet.species, pet.notes].filter(Boolean).join('. ');
  }
}
