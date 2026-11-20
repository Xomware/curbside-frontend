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
});
