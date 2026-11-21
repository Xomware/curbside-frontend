import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { answerBy, fakeTokens, json } from '../../../testing/fakes';
import { place } from '../../../testing/map-fixtures';
import { routes } from '../../app.routes';
import { AuthSession } from '../../auth/auth-session';

describe('ActivityPage', () => {
  const recent = new Date(Date.now() - 5 * 60_000).toISOString();
  const feed = {
    items: [
      {
        id: '2',
        kind: 'member_joined',
        actor_name: 'Sam',
        map_id: 'map1',
        map_name: 'Quillfeather Ln',
        created_at: recent,
      },
      { id: '1', kind: 'friend_added', actor_name: 'Ida', created_at: '2026-11-01T12:00:00Z' },
    ],
    unread: 1,
  };
  let answers: Record<string, Response[]>;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sessionStorage.clear();
    answers = {
      'GET /me': [json(200, { data: { account_id: 'a', display_name: 'Dom', identities: [] } })],
      'GET /activity': [json(200, { data: feed })],
      'POST /activity/seen': [new Response(null, { status: 204 })],
      'GET /maps': [json(200, { data: [place] })],
      'GET /maps/map1': [json(200, { data: { map: place, households: [] } })],
      'GET /maps/map1/footprints': [json(202, { data: { status: 'pending' } })],
    };
    fetchMock = vi.fn(answerBy(answers));
    vi.stubGlobal('fetch', fetchMock);
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    TestBed.inject(AuthSession).adopt(fakeTokens());
  });
  afterEach(() => vi.unstubAllGlobals());

  async function open() {
    const harness = await RouterTestingHarness.create('/activity');
    const el = () => harness.routeNativeElement as HTMLElement;
    const settle = (check: () => void) =>
      vi.waitFor(() => {
        harness.detectChanges();
        check();
      });
    return { el, settle };
  }
  const posts = () =>
    fetchMock.mock.calls.filter(
      ([url, init]) => init?.method === 'POST' && String(url).endsWith('/activity/seen'),
    );

  it('lists what happened, flags the unread ones, and marks them seen', async () => {
    const { el, settle } = await open();
    await settle(() => expect(el().textContent).toContain('Sam joined Quillfeather Ln'));

    expect(el().textContent).toContain('You and Ida are friends');
    expect(el().textContent).toContain('5 minutes ago');
    const rows = el().querySelectorAll('li');
    expect(rows[0].querySelector('.tag')?.textContent).toBe('New');
    expect(rows[1].querySelector('.tag')).toBeNull();
    await settle(() => expect(posts()).toHaveLength(1));
  });

  it('opens the street an item is about', async () => {
    const { el, settle } = await open();
    await settle(() => expect(el().querySelector('button.row')).not.toBeNull());
    expect(el().querySelectorAll('button.row')).toHaveLength(1);

    (el().querySelector('button.row') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/'));
    expect(localStorage.getItem('curbside.map')).toBe('map1');
  });

  it("doesn't post seen when nothing is new", async () => {
    answers['GET /activity'] = [json(200, { data: { items: [], unread: 0 } })];
    const { el, settle } = await open();
    await settle(() => expect(el().textContent).toContain('Nothing yet'));
    expect(posts()).toHaveLength(0);
  });

  it('shows the unread count on the nav until the feed is opened', async () => {
    const harness = await RouterTestingHarness.create('/profile');
    const nav = () => harness.fixture.nativeElement.querySelector('nav') as HTMLElement;
    await vi.waitFor(() => {
      harness.detectChanges();
      expect(nav().querySelector('.badge')?.textContent).toBe('1');
    });

    await harness.navigateByUrl('/activity');
    await vi.waitFor(() => {
      harness.detectChanges();
      expect(nav().querySelector('.badge')).toBeNull();
    });
  });
});
