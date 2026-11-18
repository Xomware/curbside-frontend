import { TestBed } from '@angular/core/testing';

import { pumpernickel } from '../../testing/card';
import { nextDoor } from '../../testing/capture-fixtures';
import { answerBy, fakeTokens, json } from '../../testing/fakes';
import { household, place } from '../../testing/map-fixtures';
import { AuthSession } from '../auth/auth-session';
import { MapStore } from '../map/map-store';
import { Spot } from '../map/models';
import { CaptureModel } from './capture-model';

const PARSE = 'POST /maps/map1/capture/parse';
const APPLY = 'POST /maps/map1/capture/apply';

describe('CaptureModel', () => {
  let answers: Record<string, Response[]>;
  let fetchMock: ReturnType<typeof vi.fn>;
  let store: MapStore;

  // Pumpernickel (h1) in osm:way/1 at the pick; ten more houses marching north.
  const street = [
    { ...pumpernickel, building_id: 'osm:way/1' },
    ...Array.from({ length: 10 }, (_, i) => household(`n${i}`, { lat: 40 + (i + 1) * 0.0001 })),
  ];

  beforeEach(() => {
    answers = { 'GET /maps/map1': [json(200, { data: { map: place, households: street } })] };
    fetchMock = vi.fn(answerBy(answers));
    vi.stubGlobal('fetch', fetchMock);
    TestBed.configureTestingModule({ providers: [CaptureModel] });
    TestBed.inject(AuthSession).adopt(fakeTokens());
    store = TestBed.inject(MapStore);
    store.place.set(place);
    store.households.set(street);
  });
  afterEach(() => vi.unstubAllGlobals());

  const sent = (key: string) =>
    fetchMock.mock.calls
      .filter(([url, init]) => `${init?.method} ${new URL(url).pathname.slice(3)}` === key)
      .map(([, init]) => JSON.parse(init.body));

  async function parsed(selection: Spot | null = null) {
    store.selection.set(selection);
    const model = TestBed.inject(CaptureModel);
    answers[PARSE] ??= [json(200, { data: nextDoor })];
    model.transcript.set('  Ran into Clementine. Odo just turned five.  ');
    await model.parse();
    return model;
  }

  it('sends text with the picked household as focus and the 8 nearest others', async () => {
    await parsed({ lat: 40, lng: -75, buildingId: 'osm:way/1' });

    const [body] = sent(PARSE);
    expect(body).toEqual({
      transcript: 'Ran into Clementine. Odo just turned five.',
      source: 'text',
      focus_household_id: 'h1',
      nearby_household_ids: ['n0', 'n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7'],
    });
  });

  it('without a pick, rosters from the place centre and sends no focus', async () => {
    await parsed();

    const [body] = sent(PARSE);
    expect(body.focus_household_id).toBeUndefined();
    expect(body.nearby_household_ids).toHaveLength(8);
    expect(body.nearby_household_ids[0]).toBe('h1');
  });

  it('unchecking a new house unchecks its people; checking a person checks their house', async () => {
    const model = await parsed();

    model.toggle(0);
    expect(model.ops().map((o) => o.checked)).toEqual([true, true, true, true]);

    model.toggle(1);
    expect(model.ops().map((o) => o.checked)).toEqual([false, false, true, true]);
  });

  it('keeps Save shut until a kept new house is placed, then sends creates first with lat/lng', async () => {
    const model = await parsed();
    model.toggle(0);
    expect(model.unplaced()).toEqual(['new:1']);
    expect(model.canSave()).toBe(false);

    model.place('new:1', {
      lat: 40.5,
      lng: -75.5,
      buildingId: 'osm:way/7',
      address: '14 Quillfeather Ln',
    });
    expect(model.canSave()).toBe(true);

    const body = model.applyBody();
    expect(body.operations.map((o) => o.op)).toEqual([
      'create_household',
      'add_person',
      'touch_last_talked',
      'update_person',
    ]);
    expect(body.operations[0].fields).toEqual({
      label: 'Next door to Pumpernickel',
      lat: 40.5,
      lng: -75.5,
      building_id: 'osm:way/7',
      address: '14 Quillfeather Ln',
    });
    expect(body.operations[0]).not.toHaveProperty('evidence');
    expect(body.base_versions).toEqual({ h1: 3 });
    expect(body.source).toBe('text');
  });

  it('places the new house at a dropped pin it was opened on', async () => {
    const model = await parsed({
      lat: 40.3,
      lng: -75.3,
      buildingId: null,
      address: '9 Quillfeather Ln',
    });
    model.toggle(1);

    expect(model.unplaced()).toEqual([]);
    expect(model.applyBody().operations[0].fields).toMatchObject({
      lat: 40.3,
      lng: -75.3,
      address: '9 Quillfeather Ln',
    });
  });

  it('applies only checked changes and leaves unchecked ones out', async () => {
    const model = await parsed();
    model.toggle(3);

    expect(model.applyBody().operations.map((o) => o.op)).toEqual(['touch_last_talked']);
  });

  it('retypes text fields, keeping required ones and dropping blanked optional ones', async () => {
    const model = await parsed();
    model.toggle(0);
    model.edit(0, { name: '  ', role: 'kid' });
    model.edit(1, { label: 'Gray house', address: 'ignored: not in the op' });
    expect(model.ops()[0].fields).toEqual({ name: 'Sam', role: 'adult' });
    expect(model.ops()[1].fields).toEqual({ label: 'Gray house' });

    model.edit(0, { name: 'Samuel' });
    expect(model.ops()[0].fields['name']).toBe('Samuel');
  });

  it('saves, then refreshes the map and drops the words', async () => {
    const model = await parsed();
    answers[APPLY] = [json(200, { data: [{ op: 'touch_last_talked', id: 'h1' }] })];

    expect(await model.apply()).toBe(true);
    expect(model.transcript()).toBe('');
    expect(sent(APPLY)).toHaveLength(1);
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/maps/map1'))).toBe(true);
  });

  it('parses again on a 409 and says why', async () => {
    const model = await parsed();
    answers[APPLY] = [json(409, { error: { code: 'version_conflict', message: 'stale' } })];

    expect(await model.apply()).toBe(false);
    expect(sent(PARSE)).toHaveLength(2);
    expect(model.phase()).toBe('review');
    expect(model.message()).toContain('Something changed on these houses since');
  });

  it.each([
    [429, "That's today's 50 captures"],
    [502, "Couldn't make sense of that"],
    [503, 'Reading is down'],
  ])('explains a %i from parse and goes back to the words', async (status, text) => {
    answers[PARSE] = [json(status, { error: { code: 'x', message: 'x' } })];
    const model = await parsed();

    expect(model.phase()).toBe('input');
    expect(model.message()).toContain(text);
  });

  it('explains a 413 from apply and stays on review', async () => {
    const model = await parsed();
    answers[APPLY] = [json(413, { error: { code: 'too_many_operations', message: 'x' } })];

    await model.apply();
    expect(model.phase()).toBe('review');
    expect(model.message()).toBe('Too many changes at once. Uncheck some and save again.');
  });
});
