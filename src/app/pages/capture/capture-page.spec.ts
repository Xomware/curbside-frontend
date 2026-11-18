import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { cardSetup, pumpernickel } from '../../../testing/card';
import { nextDoor } from '../../../testing/capture-fixtures';
import { json } from '../../../testing/fakes';
import { place } from '../../../testing/map-fixtures';

describe('CapturePage', () => {
  let t: ReturnType<typeof cardSetup>;
  let harness: RouterTestingHarness;
  const el = () => harness.routeNativeElement as HTMLElement;
  const settle = (check: () => void) =>
    vi.waitFor(() => {
      harness.detectChanges();
      check();
    });
  const button = (name: string) =>
    [...el().querySelectorAll('button')].find((b) => b.textContent?.trim() === name);

  beforeEach(() => {
    t = cardSetup();
    t.answers['GET /maps/map1'] = [json(200, { data: { map: place, households: [pumpernickel] } })];
    t.answers['POST /maps/map1/capture/parse'] = [json(200, { data: nextDoor })];
  });
  afterEach(() => vi.unstubAllGlobals());

  async function review() {
    harness = await RouterTestingHarness.create('/capture');
    await settle(() => expect(el().querySelector('#transcript')).not.toBeNull());
    const area = el().querySelector('#transcript') as HTMLTextAreaElement;
    area.value =
      "Ran into Clementine. Odo just turned five. Next door to Pumpernickel's there's a guy named Sam who just moved in.";
    area.dispatchEvent(new Event('input'));
    await settle(() => expect(button('Check it')?.disabled).toBe(false));
    button('Check it')?.click();
    await settle(() => expect(el().textContent).toContain('4 found'));
  }

  it('paints the evidence, lists each change, and takes the detour for what it could not place', async () => {
    await review();

    expect([...el().querySelectorAll('mark')].map((m) => m.textContent)).toEqual([
      'Ran into Clementine (change 3)',
      'Odo just turned five (change 4)',
      "Next door to Pumpernickel's there's a guy (change 2)",
    ]);
    expect([...el().querySelectorAll('.op__change')].map((p) => p.textContent?.trim())).toEqual([
      'Sam, adult',
      'Next door to Pumpernickel',
      'Talked today',
      'Born 2021',
    ]);
    expect(el().querySelector('.detour')?.textContent).toContain('the guy with the red truck');
    expect(el().querySelectorAll('.flag')).toHaveLength(2);
  });

  it('without the map, says a new house cannot be placed and saves the rest once it is unchecked', async () => {
    await review();
    const boxes = () => [...el().querySelectorAll<HTMLInputElement>('.op input[type=checkbox]')];

    boxes()[0].click();
    await settle(() => expect(el().textContent).toContain('Placing a new house needs the map'));
    expect(button('Place the new house')?.disabled).toBe(true);

    boxes()[1].click();
    await settle(() => expect(button('Save 2 changes')?.disabled).toBe(false));

    t.answers['POST /maps/map1/capture/apply'] = [json(200, { data: [] })];
    button('Save 2 changes')?.click();
    await settle(() => expect(TestBed.inject(Router).url).toBe('/'));
    expect(t.sent('POST', '/capture/apply')[0].operations.map((o: { op: string }) => o.op)).toEqual(
      ['touch_last_talked', 'update_person'],
    );
  });

  it('retypes a change before saving', async () => {
    await review();
    (el().querySelector('.op button.btn-text') as HTMLButtonElement).click();
    await settle(() => expect(el().querySelector('#op-name')).not.toBeNull());

    const name = el().querySelector('#op-name') as HTMLInputElement;
    name.value = 'Samuel';
    name.dispatchEvent(new Event('input'));
    button('Done')?.click();

    await settle(() =>
      expect(el().querySelector('.op__change')?.textContent?.trim()).toBe('Samuel, adult'),
    );
  });

  it('goes back to the words with the reason when parsing fails', async () => {
    t.answers['POST /maps/map1/capture/parse'] = [
      json(429, { error: { code: 'quota_exceeded', message: 'x' } }),
    ];
    harness = await RouterTestingHarness.create('/capture');
    await settle(() => expect(el().querySelector('#transcript')).not.toBeNull());
    const area = el().querySelector('#transcript') as HTMLTextAreaElement;
    area.value = 'Ran into Clementine.';
    area.dispatchEvent(new Event('input'));
    await settle(() => expect(button('Check it')?.disabled).toBe(false));
    button('Check it')?.click();

    await settle(() => expect(el().textContent).toContain("That's today's 50 captures."));
    expect((el().querySelector('#transcript') as HTMLTextAreaElement).value).toBe(
      'Ran into Clementine.',
    );
  });
});
