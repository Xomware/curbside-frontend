import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { answerBy, fakeTokens, json } from '../../../testing/fakes';
import { household, place } from '../../../testing/map-fixtures';
import { routes } from '../../app.routes';
import { AuthSession } from '../../auth/auth-session';

describe('ProfilePage', () => {
  const recent = new Date(Date.now() - 2 * 86_400_000).toISOString();
  const homes = [
    household('a', {
      private: {
        label: 'Pumpernickel',
        address: '11 Quillfeather Ln',
        last_talked_at: recent,
        people: [
          { id: 'p1', version: 1, name: 'Barnaby', role: 'adult' },
          { id: 'p2', version: 1, name: 'Odo', role: 'kid' },
        ],
        pets: [{ id: 'x1', version: 1, name: 'Waffles' }],
      },
    }),
    household('b', {
      private: { label: 'Mossbottom', address: '21 Quillfeather Ln', last_talked_at: null },
    }),
  ];

  beforeEach(() => {
    sessionStorage.clear();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        answerBy({
          'GET /me': [
            json(200, {
              data: {
                account_id: 'a',
                display_name: 'Dom Giordano',
                created_at: '2026-10-02T00:00:00Z',
                identities: [{ sub: 's', provider: 'apple', created_at: '2026-10-02T00:00:00Z' }],
              },
            }),
          ],
          'GET /maps': [json(200, { data: [place] })],
          'GET /maps/map1': [json(200, { data: { map: place, households: homes } })],
          'GET /maps/map1/members': [
            json(200, {
              data: [
                { account_id: 'a', display_name: 'Dom Giordano', role: 'owner', created_at: '' },
                { account_id: 'b', display_name: 'Sam Rivera', role: 'member', created_at: '' },
              ],
            }),
          ],
          'POST /maps/map1/invites': [
            json(201, { data: { code: 'K7QW2M9XRT', expires_at: '2026-11-27T12:00:00Z' } }),
          ],
          'GET /friends': [
            json(200, {
              data: [
                { account_id: 'b', display_name: 'Sam Rivera', since: '', shared_maps: [] },
                { account_id: 'c', display_name: 'Ida Moss', since: '', shared_maps: [] },
              ],
            }),
          ],
          'POST /maps/map1/members': [
            json(201, {
              data: { account_id: 'c', display_name: 'Ida Moss', role: 'member', created_at: '' },
            }),
          ],
          'PATCH /me': [
            json(200, {
              data: { account_id: 'a', display_name: 'Dominick', created_at: '', identities: [] },
            }),
          ],
        }),
      ),
    );
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    TestBed.inject(AuthSession).adopt(fakeTokens());
  });
  afterEach(() => vi.unstubAllGlobals());

  it('shows who you are, your street counts, and who is due for a hello', async () => {
    const harness = await RouterTestingHarness.create('/profile');
    const el = harness.routeNativeElement as HTMLElement;
    await vi.waitFor(() => {
      harness.detectChanges();
      expect(el.textContent).toContain('Due for a hello');
    });

    expect(el.querySelector('h1')?.textContent).toBe('Dom Giordano');
    expect(el.querySelector('.monogram')?.textContent).toBe('DG');
    expect(el.textContent).toContain('Apple');
    const stats = [...el.querySelectorAll('.stats div')].map((d) =>
      d.textContent?.replace(/\s+/g, ' ').trim(),
    );
    expect(stats).toEqual(['Homes2', 'People2', 'Pets1', 'Talked this month1']);
    const due = [...el.querySelectorAll('.due li')].map((li) => li.textContent);
    expect(due[0]).toContain('Mossbottom');
    expect(due[0]).toContain("Haven't talked yet");
  });

  it('renames you, lists who the street is shared with, and makes an invite link', async () => {
    const harness = await RouterTestingHarness.create('/profile');
    const el = harness.routeNativeElement as HTMLElement;
    const button = (text: string) =>
      [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === text);
    const settle = (check: () => void) =>
      vi.waitFor(() => {
        harness.detectChanges();
        check();
      });
    await settle(() => expect(el.textContent).toContain('Sam Rivera'));
    expect(el.textContent).toContain('Owner');

    button('Invite someone')?.click();
    await settle(() =>
      expect(el.querySelector<HTMLInputElement>('#invite-link')?.value).toBe(
        `${location.origin}/invite/K7QW2M9XRT`,
      ),
    );

    button('Edit name')?.click();
    await settle(() => expect(el.querySelector('#profile-name')).not.toBeNull());
    const input = el.querySelector<HTMLInputElement>('#profile-name')!;
    input.value = 'Dominick';
    input.dispatchEvent(new Event('input'));
    button('Save')?.click();
    await settle(() => expect(el.querySelector('h1')?.textContent).toBe('Dominick'));
  });

  it('adds a friend who is not on the street yet', async () => {
    const harness = await RouterTestingHarness.create('/profile');
    const el = harness.routeNativeElement as HTMLElement;
    const button = (text: string) =>
      [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === text);
    const settle = (check: () => void) =>
      vi.waitFor(() => {
        harness.detectChanges();
        check();
      });
    await settle(() => expect(button('Add a friend')).toBeDefined());

    button('Add a friend')?.click();
    await settle(() => expect(el.querySelector('[aria-label="Add Ida Moss"]')).not.toBeNull());
    expect(el.querySelector('[aria-label="Add Sam Rivera"]')).toBeNull();

    el.querySelector<HTMLButtonElement>('[aria-label="Add Ida Moss"]')!.click();
    await settle(() => expect(el.querySelector('.members')?.textContent).toContain('Ida Moss'));
    expect(el.textContent).toContain('Every friend of yours is already on this street.');
    const post = vi
      .mocked(fetch)
      .mock.calls.find(
        ([url, init]) => init?.method === 'POST' && String(url).endsWith('/members'),
      );
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({ account_id: 'c' });
  });
});
