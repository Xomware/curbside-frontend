import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { age, born, noteDate, talked } from '../../household/format';
import { HouseholdModel } from '../../household/household-model';
import { SectionSign } from '../../household/section-sign';
import { Person, Pet } from '../../map/models';

/** The household card: who lives here, their kids and pets, and what you've noted. */
@Component({
  selector: 'xom-household-page',
  imports: [RouterLink, SectionSign],
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

  constructor() {
    void this.model.open(inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '');
  }

  protected detail(person: Person): string {
    return [born(person), person.notes].filter(Boolean).join('. ');
  }

  protected petDetail(pet: Pet): string {
    return [pet.species, pet.notes].filter(Boolean).join('. ');
  }
}
