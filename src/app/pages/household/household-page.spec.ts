import { TestBed } from '@angular/core/testing';

import { cardSetup, HH, pumpernickel } from '../../../testing/card';
import { json } from '../../../testing/fakes';
import { household } from '../../../testing/map-fixtures';
import { MapStore } from '../../map/map-store';

describe('HouseholdPage', () => {
  let t: ReturnType<typeof cardSetup>;

  beforeEach(() => (t = cardSetup()));
  afterEach(() => vi.unstubAllGlobals());

  const withNotes = (notes: NonNullable<typeof pumpernickel.private.notes>) => ({
    ...pumpernickel,
    private: { ...pumpernickel.private, notes },
  });

  it('shows adults, kids with age signs, pets and notes in card order', async () => {
    const note = {
      id: 'n1',
      text: 'Staying through Thanksgiving.',
      source: 'voice' as const,
      created_at: '2026-11-10T15:00:00Z',
    };
    await t.open(withNotes([note]), 'Staying through Thanksgiving.');
    const el = t.el();

    expect([...el.querySelectorAll('h2')].map((h) => h.textContent)).toEqual([
      'Adults',
      'Kids',
      'Pets',
      'Notes',
    ]);
    expect(el.querySelector('.hero .eyebrow')?.textContent).toBe('11 Quillfeather Ln');
    expect(el.textContent).toContain('Owns a table saw.');
    expect(el.querySelector('.age')?.textContent).toContain(
      '~' + (new Date().getFullYear() - 2021),
    );
    expect(el.textContent).toContain('Born ~2021, a guess');
    expect(el.textContent).toContain('NOV 10');
    expect(TestBed.inject(MapStore).household('h1')?.private.notes).toHaveLength(1);
  });

  it('says there are no notes once loaded, and hides empty sections', async () => {
    const empty = household('h1', {
      private: {
        label: 'Quillby',
        address: null,
        last_talked_at: null,
        people: [],
        pets: [],
        notes: [],
      },
    });
    await t.open(empty, 'No notes yet', empty);

    expect([...t.el().querySelectorAll('h2')].map((h) => h.textContent)).toEqual(['Notes']);
    expect(t.el().textContent).toContain("Haven't talked yet");
  });

  it('keeps the map copy and offers a retry when the notes fail to load', async () => {
    t.answers[`GET ${HH}`] = [json(500, {}), json(200, { data: withNotes([]) })];
    await t.open(pumpernickel, "Couldn't load their notes.");
    expect(t.el().textContent).toContain('Barnaby');

    t.button('Try again')?.click();

    await t.settle(() => expect(t.el().textContent).toContain('No notes yet'));
  });

  it('says so when the household is not on the map', async () => {
    await t.open(pumpernickel, 'Not on your map', household('other'));
  });
});
