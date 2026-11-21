import { TestBed } from '@angular/core/testing';

import { cardSetup, HH, pumpernickel } from '../../../testing/card';
import { json } from '../../../testing/fakes';
import { MapStore } from '../../map/map-store';
import { Person } from '../../map/models';

describe('HouseholdPage editing', () => {
  let t: ReturnType<typeof cardSetup>;
  const full = { ...pumpernickel, private: { ...pumpernickel.private, notes: [] } };

  beforeEach(() => (t = cardSetup()));
  afterEach(() => vi.unstubAllGlobals());

  const input = (id: string) => t.el().querySelector(`#${id}`) as HTMLInputElement;
  function type(id: string, value: string) {
    input(id).value = value;
    input(id).dispatchEvent(new Event('input'));
  }
  const entry = (name: string) =>
    [...t.el().querySelectorAll<HTMLButtonElement>('button.entry')].find((b) =>
      b.textContent?.includes(name),
    );

  async function editBarnaby() {
    await t.open(full, 'No notes yet');
    entry('Barnaby')?.click();
    await t.settle(() => expect(input('person-name')?.value).toBe('Barnaby'));
  }

  it('PATCHes only the changed fields and shows the saved person', async () => {
    await editBarnaby();
    const saved: Person = { ...pumpernickel.private.people![0], version: 2, notes: 'Lends tools.' };
    t.answers[`PATCH ${HH}/people/p1`] = [json(200, { data: saved })];

    type('person-notes', 'Lends tools.');
    t.button('Save')?.click();

    await t.settle(() => expect(t.el().textContent).toContain('Lends tools.'));
    expect(t.sent('PATCH', `${HH}/people/p1`)).toEqual([{ version: 1, notes: 'Lends tools.' }]);
    expect(TestBed.inject(MapStore).household('h1')?.private.people?.[0].notes).toBe(
      'Lends tools.',
    );
    expect(t.el().querySelector('[role=status]')?.textContent).toBe('Barnaby saved.');
  });

  it('on a 409 reloads the card, keeps the draft open, and diffs against the fresh copy next time', async () => {
    await editBarnaby();
    const theirs = { ...pumpernickel.private.people![0], version: 5, name: 'Barnaby' };
    t.answers[`PATCH ${HH}/people/p1`] = [
      json(409, { error: { code: 'version_conflict', message: 'changed' } }),
      json(200, { data: { ...theirs, version: 6, notes: 'Mine' } }),
    ];
    t.answers[`GET ${HH}`] = [
      json(200, { data: { ...full, private: { ...full.private, people: [theirs] } } }),
    ];

    type('person-notes', 'Mine');
    t.button('Save')?.click();

    await t.settle(() =>
      expect(t.el().textContent).toContain('Someone else changed this household'),
    );
    expect(input('person-notes').value).toBe('Mine');

    t.button('Save')?.click();
    await t.settle(() =>
      expect(t.el().querySelector('[role=status]')?.textContent).toBe('Barnaby saved.'),
    );
    expect(t.sent('PATCH', `${HH}/people/p1`)[1]).toEqual({ version: 5, notes: 'Mine' });
  });

  it('adds a kid and a pet', async () => {
    await t.open(full, 'No notes yet');
    const kid: Person = {
      id: 'p9',
      version: 1,
      name: 'Fig',
      role: 'kid',
      birth_year: 2016,
      birth_year_approx: false,
    };
    t.answers[`POST ${HH}/people`] = [json(201, { data: kid })];
    t.answers[`POST ${HH}/pets`] = [
      json(201, { data: { id: 'x9', version: 1, name: 'Pickles', species: 'cat' } }),
    ];

    t.button('Add a person')?.click();
    await t.settle(() => expect(input('person-name')).not.toBeNull());
    type('person-name', 'Fig');
    (t.el().querySelector('input[value=kid]') as HTMLInputElement).click();
    type('person-year', '2016');
    t.button('Save')?.click();
    await t.settle(() => expect(entry('Fig')).toBeDefined());

    t.button('Add a pet')?.click();
    await t.settle(() => expect(input('pet-name')).not.toBeNull());
    type('pet-name', 'Pickles');
    type('pet-species', 'cat');
    t.button('Save')?.click();
    await t.settle(() => expect(entry('Pickles')).toBeDefined());

    expect(t.sent('POST', `${HH}/people`)).toEqual([
      { name: 'Fig', role: 'kid', birth_year: 2016, birth_year_approx: false },
    ]);
    expect(t.sent('POST', `${HH}/pets`)).toEqual([{ name: 'Pickles', species: 'cat' }]);
  });

  it('blocks a nameless save without calling the API', async () => {
    await editBarnaby();
    type('person-name', '  ');
    t.button('Save')?.click();

    await t.settle(() => expect(t.el().textContent).toContain('Add a name.'));
    expect(t.sent('PATCH', `${HH}/people/p1`)).toEqual([]);
  });

  it('removes a pet after a confirming click, treating 404 as already gone', async () => {
    await t.open(full, 'No notes yet');
    t.answers[`DELETE ${HH}/pets/x1`] = [
      json(404, { error: { code: 'pet_not_found', message: 'gone' } }),
    ];
    entry('Waffles')?.click();
    await t.settle(() => expect(t.button('Remove')).toBeDefined());

    t.button('Remove')?.click();
    await t.settle(() => expect(t.button('Remove Waffles for good')).toBeDefined());
    t.button('Remove Waffles for good')?.click();

    await t.settle(() =>
      expect(t.el().querySelector('[role=status]')?.textContent).toBe('Waffles removed.'),
    );
    expect(entry('Barnaby')).toBeDefined();
    expect(entry('Waffles')).toBeUndefined();
    expect(t.sent('DELETE', `${HH}/pets/x1`)).toHaveLength(1);
  });

  it('saves a phone and email, then links them and offers a contact card', async () => {
    await editBarnaby();
    const saved: Person = {
      ...pumpernickel.private.people![0],
      version: 2,
      phone: '555-0101',
      email: 'barnaby@example.com',
    };
    t.answers[`PATCH ${HH}/people/p1`] = [json(200, { data: saved })];

    type('person-phone', '555-0101');
    type('person-email', 'barnaby@example.com');
    t.button('Save')?.click();

    await t.settle(() => expect(t.el().querySelector('a[href="tel:555-0101"]')).not.toBeNull());
    expect(t.sent('PATCH', `${HH}/people/p1`)).toEqual([
      { version: 1, phone: '555-0101', email: 'barnaby@example.com' },
    ]);
    expect(t.el().querySelector('a[href="mailto:barnaby@example.com"]')).not.toBeNull();

    const blobs: Blob[] = [];
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      blobs.push(blob as Blob);
      return 'blob:card';
    });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    t.button('Save contact')?.click();

    expect(click).toHaveBeenCalledOnce();
    expect(blobs[0].type).toBe('text/vcard');
    expect(await blobs[0].text()).toContain('ADR;TYPE=HOME:;;11 Quillfeather Ln;;;;');
    vi.restoreAllMocks();
  });
});
