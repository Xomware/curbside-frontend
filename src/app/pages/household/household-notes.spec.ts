import { TestBed } from '@angular/core/testing';

import { cardSetup, HH, pumpernickel } from '../../../testing/card';
import { json } from '../../../testing/fakes';
import { MapStore } from '../../map/map-store';

describe('HouseholdPage notes and talked today', () => {
  let t: ReturnType<typeof cardSetup>;
  const old = {
    id: 'n0',
    text: 'Borrowed the ladder.',
    source: 'text' as const,
    created_at: '2026-10-02T15:00:00Z',
  };
  const full = {
    ...pumpernickel,
    private: { ...pumpernickel.private, last_talked_at: '2026-10-02T15:00:00Z', notes: [old] },
  };

  beforeEach(() => (t = cardSetup()));
  afterEach(() => vi.unstubAllGlobals());

  it('logs a manual note, puts it first, and counts as talking today without a version bump', async () => {
    await t.open(full, 'Borrowed the ladder.');
    const created = {
      id: 'n1',
      text: 'Mom staying through Thanksgiving.',
      source: 'manual',
      created_at: new Date().toISOString(),
    };
    t.answers[`POST ${HH}/notes`] = [json(201, { data: created })];

    t.button('Add a note')?.click();
    await t.settle(() => expect(t.el().querySelector('#note-text')).not.toBeNull());
    const text = t.el().querySelector('#note-text') as HTMLTextAreaElement;
    text.value = '  Mom staying through Thanksgiving. ';
    text.dispatchEvent(new Event('input'));
    await t.settle(() => expect(t.button('Save note')?.disabled).toBe(false));
    t.button('Save note')?.click();

    await t.settle(() =>
      expect(t.el().querySelector('[role=status]')?.textContent).toBe('Note saved.'),
    );
    expect(t.el().textContent).toContain('Talked today');
    expect(t.sent('POST', `${HH}/notes`)).toEqual([
      { text: 'Mom staying through Thanksgiving.', source: 'manual' },
    ]);
    expect([...t.el().querySelectorAll('.note p')].map((p) => p.textContent)).toEqual([
      'Mom staying through Thanksgiving.',
      'Borrowed the ladder.',
    ]);
    const onMap = TestBed.inject(MapStore).household('h1');
    expect(onMap?.version).toBe(3);
    expect(onMap?.private.last_talked_at).toBe(created.created_at);
    expect(t.button('Talked today')).toBeUndefined();
  });

  it('marks talked today with a second-precision timestamp and keeps people the PATCH left out', async () => {
    await t.open(full, 'Borrowed the ladder.');
    const at = '2026-11-17T15:00:00Z';
    const { people: _people, pets: _pets, ...rest } = full.private;
    t.answers[`PATCH ${HH}`] = [
      json(200, { data: { ...full, version: 4, private: { ...rest, last_talked_at: at } } }),
    ];

    t.button('Talked today')?.click();

    await t.settle(() =>
      expect(t.el().querySelector('[role=status]')?.textContent).toBe('Marked as talked today.'),
    );
    const [body] = t.sent('PATCH', HH);
    expect(Object.keys(body)).toEqual(['version', 'last_talked_at']);
    expect(body.version).toBe(3);
    expect(body.last_talked_at).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/);
    expect(TestBed.inject(MapStore).household('h1')?.version).toBe(4);
    expect(t.el().textContent).toContain('Barnaby');
  });

  it('reloads on a 409 and asks again', async () => {
    await t.open(full, 'Borrowed the ladder.');
    t.answers[`PATCH ${HH}`] = [
      json(409, { error: { code: 'version_conflict', message: 'changed' } }),
    ];

    t.button('Talked today')?.click();

    await t.settle(() =>
      expect(t.el().textContent).toContain("Here's their version; mark it again."),
    );
    expect(
      t.fetchMock.mock.calls.filter(
        ([url, init]) => String(url).endsWith(HH) && init?.method === 'GET',
      ),
    ).toHaveLength(2);
  });

  it('deletes a note on the second click', async () => {
    await t.open(full, 'Borrowed the ladder.');
    t.answers[`DELETE ${HH}/notes/n0`] = [json(200, { data: { id: 'n0' } })];

    (t.el().querySelector('[aria-label="Delete note from OCT 02"]') as HTMLButtonElement).click();
    await t.settle(() => expect(t.button('Delete for good')).toBeDefined());
    t.button('Delete for good')?.click();

    await t.settle(() => expect(t.el().textContent).toContain('No notes yet'));
  });
});
