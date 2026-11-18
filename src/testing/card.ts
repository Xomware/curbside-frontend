import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { routes } from '../app/app.routes';
import { AuthSession } from '../app/auth/auth-session';
import { Household } from '../app/map/models';
import { answerBy, fakeTokens, json } from './fakes';
import { household, place } from './map-fixtures';

export const pumpernickel = household('h1', {
  version: 3,
  private: {
    label: 'Pumpernickel',
    address: '11 Quillfeather Ln',
    last_talked_at: null,
    people: [
      {
        id: 'p1',
        version: 1,
        name: 'Barnaby',
        role: 'adult',
        birth_year_approx: false,
        notes: 'Owns a table saw.',
      },
      { id: 'p2', version: 1, name: 'Odo', role: 'kid', birth_year: 2021, birth_year_approx: true },
    ],
    pets: [{ id: 'x1', version: 1, name: 'Waffles', species: 'basset hound' }],
  },
});

export const HH = '/maps/map1/households/h1';

/** Signed in, with an API answering by method and path. Call inside beforeEach; returns what tests poke at. */
export function cardSetup() {
  const answers: Record<string, Response[]> = {
    'GET /me': [json(200, { data: { account_id: 'a', display_name: 'Dom', identities: [] } })],
    'GET /maps': [json(200, { data: [place] })],
  };
  const fetchMock = vi.fn(answerBy(answers));
  sessionStorage.clear();
  vi.stubGlobal('fetch', fetchMock);
  TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
  TestBed.inject(AuthSession).adopt(fakeTokens());

  let harness: RouterTestingHarness;
  const el = () => harness.routeNativeElement as HTMLElement;
  const settle = async (check: () => void) =>
    vi.waitFor(() => {
      harness.detectChanges();
      check();
    });

  /** Opens the card with the map holding `onMap` and the card GET answering `full`, then waits for `text`. */
  async function open(full: Household, text: string, onMap: Household = pumpernickel) {
    answers['GET /maps/map1'] = [json(200, { data: { map: place, households: [onMap] } })];
    answers[`GET ${HH}`] ??= [json(200, { data: full })];
    harness = await RouterTestingHarness.create('/households/h1');
    await settle(() => expect(el().textContent).toContain(text));
  }

  const button = (text: string) =>
    [...el().querySelectorAll('button')].find((b) => b.textContent?.trim() === text) as
      HTMLButtonElement | undefined;
  const sent = (method: string, path: string) =>
    fetchMock.mock.calls
      .filter(([url, init]) => (init?.method ?? 'GET') === method && String(url).endsWith(path))
      .map(([, init]) => JSON.parse(String(init?.body)));

  return { answers, fetchMock, open, el, settle, button, sent };
}
