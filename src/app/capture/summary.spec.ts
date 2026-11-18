import { pumpernickel } from '../../testing/card';
import { nextDoor, op } from '../../testing/capture-fixtures';
import { evidenceMarks, newLabels, summarize } from './summary';

describe('capture summary', () => {
  const homes = [pumpernickel];
  const labels = newLabels(nextDoor.operations);
  const read = (o: Parameters<typeof summarize>[0]) => summarize(o, homes, labels);

  it('names the house, the person and the change', () => {
    expect(nextDoor.operations.map(read)).toEqual([
      { number: null, who: 'NEXT DOOR TO PUMPERNICKEL · NEW PERSON', change: 'Sam, adult' },
      {
        number: null,
        who: 'NEXT DOOR TO PUMPERNICKEL · NEW HOUSE',
        change: 'Next door to Pumpernickel',
      },
      { number: '11', who: 'PUMPERNICKEL', change: 'Talked today' },
      { number: '11', who: 'PUMPERNICKEL · ODO', change: 'Born 2021' },
    ]);
  });

  it('reads pets, notes and cleared fields', () => {
    expect(
      read(op({ op: 'add_pet', household_ref: 'h1', fields: { name: 'Pickles', species: 'cat' } }))
        .change,
    ).toBe('Pickles, cat');
    expect(
      read(op({ op: 'update_pet', household_ref: 'h1', target_id: 'x1', fields: { notes: null } })),
    ).toEqual({
      number: '11',
      who: 'PUMPERNICKEL · WAFFLES',
      change: 'Notes: cleared',
    });
    expect(
      read(
        op({
          op: 'add_note',
          household_ref: 'h1',
          fields: { text: 'Starts kindergarten in the fall.' },
        }),
      ).who,
    ).toBe('PUMPERNICKEL · NOTE');
    expect(
      read(
        op({
          op: 'add_person',
          household_ref: 'h1',
          fields: { name: 'Fig', birth_year: 2020, birth_year_approx: true },
        }),
      ).change,
    ).toBe('Fig, born ~2020');
  });

  it('marks evidence case-insensitively, in reading order, skipping overlaps and misses', () => {
    const said = 'Ran into Clementine walking Waffles. Odo just turned five!';
    expect(
      evidenceMarks(said, [
        'odo just turned five!',
        'ran into clementine',
        'Clementine walking',
        'not said',
      ]),
    ).toEqual([
      { start: 0, end: 19, number: 2 },
      { start: 37, end: 57, number: 1 },
    ]);
  });
});
