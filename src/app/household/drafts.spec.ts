import { Person, Pet } from '../map/models';
import {
  personCreate,
  personDraft,
  personPatch,
  personProblem,
  petCreate,
  petDraft,
  petPatch,
  petProblem,
} from './drafts';

const odo: Person = {
  id: 'p',
  version: 4,
  name: 'Odo',
  role: 'kid',
  birth_year: 2021,
  birth_year_approx: true,
  notes: 'Shy',
};
const waffles: Pet = { id: 'x', version: 2, name: 'Waffles', species: 'basset hound' };

describe('drafts', () => {
  it('patches only what changed, with the item version', () => {
    expect(personPatch(odo, { ...personDraft(odo), approx: false, name: ' Odo B ' })).toEqual({
      version: 4,
      name: 'Odo B',
      birth_year_approx: false,
    });
    expect(petPatch(waffles, { ...petDraft(waffles), notes: 'Barks at mail' })).toEqual({
      version: 2,
      notes: 'Barks at mail',
    });
  });

  it('clears a blanked optional field with null', () => {
    expect(personPatch(odo, { ...personDraft(odo), birthYear: '', notes: '  ' })).toEqual({
      version: 4,
      birth_year: null,
      notes: null,
    });
    expect(petPatch(waffles, { ...petDraft(waffles), species: '' })).toEqual({
      version: 2,
      species: null,
    });
  });

  it('has nothing to send when nothing changed', () => {
    expect(personPatch(odo, personDraft(odo))).toBeNull();
    expect(
      personPatch(
        { ...odo, birth_year_approx: undefined, birth_year: undefined, notes: undefined },
        {
          ...personDraft(),
          name: 'Odo',
          role: 'kid',
        },
      ),
    ).toBeNull();
  });

  it('creates without the blank optional fields', () => {
    expect(
      personCreate({ ...personDraft(), name: 'Juniper', role: 'kid', birthYear: '2018' }),
    ).toEqual({
      name: 'Juniper',
      role: 'kid',
      birth_year: 2018,
      birth_year_approx: false,
    });
    expect(petCreate({ name: 'Pickles', species: 'cat', notes: '' })).toEqual({
      name: 'Pickles',
      species: 'cat',
    });
  });

  it('explains what blocks a save', () => {
    expect(personProblem({ ...personDraft(), name: ' ' })).toBe('Add a name.');
    expect(personProblem({ ...personDraft(), name: 'A', birthYear: '18' }, 2026)).toBe(
      'Birth year should be between 1900 and 2026.',
    );
    expect(personProblem({ ...personDraft(), name: 'A', birthYear: '2027' }, 2026)).not.toBeNull();
    expect(personProblem({ ...personDraft(), name: 'A', birthYear: '2026' }, 2026)).toBeNull();
    expect(petProblem({ name: 'P', species: 'x'.repeat(41), notes: '' })).toBe(
      'Keep the kind of animal under 40 characters.',
    );
  });
});
