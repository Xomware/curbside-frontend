import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { answerBy, fakeTokens, json } from '../../../testing/fakes';
import { place } from '../../../testing/map-fixtures';
import { routes } from '../../app.routes';
import { AuthSession } from '../../auth/auth-session';

describe('AdminPage', () => {
  const stats = {
    accounts: 2,
    maps: 1,
    households: 3,
    people: 5,
    pets: 1,
    notes: 4,
    friendships: 1,
    devices: 0,
    open_invites: 2,
  };
  const me = (isAdmin: boolean) =>
    json(200, {
      data: { account_id: 'a', display_name: 'Dom', identities: [], is_admin: isAdmin },
    });
  let answers: Record<string, Response[]>;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sessionStorage.clear();
    answers = {
      'GET /me': [me(true)],
      'GET /activity': [json(200, { data: { items: [], unread: 0 } })],
      'GET /maps': [json(200, { data: [place] })],
      'GET /maps/map1': [json(200, { data: { map: place, households: [] } })],
      'GET /maps/map1/footprints': [json(202, { data: { status: 'pending' } })],
      'GET /admin/stats': [json(200, { data: stats }), json(200, { data: { ...stats, maps: 0 } })],
      'GET /admin/accounts': [
        json(200, {
          data: [
            {
              account_id: 'a',
              display_name: 'Dom',
              created_at: '2026-10-02T00:00:00Z',
              providers: ['google', 'apple'],
              map_count: 1,
            },
          ],
        }),
      ],
      'GET /admin/maps': [
        json(200, {
          data: [
            {
              map_id: 'map1',
              name: 'Quillfeather Ln',
              created_at: '2026-10-02T00:00:00Z',
              owner_name: 'Dom',
              member_count: 2,
              household_count: 3,
            },
          ],
        }),
      ],
      'DELETE /admin/maps/map1': [new Response(null, { status: 204 })],
    };
    fetchMock = vi.fn(answerBy(answers));
    vi.stubGlobal('fetch', fetchMock);
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    TestBed.inject(AuthSession).adopt(fakeTokens());
  });
  afterEach(() => vi.unstubAllGlobals());

  async function open(url = '/admin') {
    const harness = await RouterTestingHarness.create(url);
    const root = () => harness.fixture.nativeElement as HTMLElement;
    const settle = (check: () => void) =>
      vi.waitFor(() => {
        harness.detectChanges();
        check();
      });
    const button = (text: string) =>
      [...root().querySelectorAll('button')].find((b) => b.textContent?.trim() === text);
    return { root, settle, button };
  }

  it('shows totals, accounts and streets, with an Admin nav link', async () => {
    const { root, settle } = await open();
    await settle(() => expect(root().textContent).toContain('Quillfeather Ln'));

    const tiles = [...root().querySelectorAll('.stats div')].map((d) =>
      d.textContent?.replace(/\s+/g, ''),
    );
    expect(tiles).toContain('Accounts2');
    expect(tiles).toContain('Openinvites2');
    expect(root().textContent).toContain('Google, Apple');
    expect(root().querySelector('nav a[href="/admin"]')).not.toBeNull();
  });

  it('deletes a street only after a confirming click', async () => {
    const { root, settle, button } = await open();
    await settle(() => expect(button('Delete')).toBeDefined());

    button('Delete')?.click();
    await settle(() => expect(button('Delete for good')).toBeDefined());
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false);

    button('Delete for good')?.click();
    await settle(() => expect(root().querySelector('tbody')?.textContent).toContain('No streets.'));
    expect(root().querySelector('[role=status]')?.textContent).toBe('Quillfeather Ln deleted.');
    expect(
      [...root().querySelectorAll('.stats div')].map((d) => d.textContent?.replace(/\s+/g, '')),
    ).toContain('Streets0');
  });

  it('sends everyone else back to the street, with no Admin link', async () => {
    answers['GET /me'] = [me(false)];
    const { root, settle } = await open();
    await settle(() => expect(TestBed.inject(Router).url).toBe('/'));
    expect(root().querySelector('nav a[href="/admin"]')).toBeNull();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/admin/'))).toBe(false);
  });
});
