import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { answerBy, fakeTokens, json } from '../../../testing/fakes';
import { routes } from '../../app.routes';
import { AuthSession } from '../../auth/auth-session';

describe('FriendsPage', () => {
  const sam = {
    account_id: 'b',
    display_name: 'Sam Rivera',
    since: '2026-11-02T00:00:00Z',
    shared_maps: [{ map_id: 'map1', name: 'Quillfeather Ln' }],
  };
  const ida = {
    account_id: 'c',
    display_name: 'Ida',
    since: '2026-11-03T00:00:00Z',
    shared_maps: [],
  };
  let fetchMock: ReturnType<typeof vi.fn>;
  let answers: Record<string, Response[]>;

  beforeEach(() => {
    sessionStorage.clear();
    answers = {
      'GET /me': [json(200, { data: { account_id: 'a', display_name: 'Dom', identities: [] } })],
      'GET /activity': [json(200, { data: { items: [], unread: 0 } })],
      'GET /friends': [json(200, { data: [sam, ida] })],
      'DELETE /friends/b': [new Response(null, { status: 204 })],
      'POST /friends/invites': [
        json(201, { data: { code: 'F7QW2M9XRT', expires_at: '2026-11-27T12:00:00Z' } }),
      ],
    };
    fetchMock = vi.fn(answerBy(answers));
    vi.stubGlobal('fetch', fetchMock);
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    TestBed.inject(AuthSession).adopt(fakeTokens());
  });
  afterEach(() => vi.unstubAllGlobals());

  async function open() {
    const harness = await RouterTestingHarness.create('/friends');
    const el = () => harness.routeNativeElement as HTMLElement;
    const settle = (check: () => void) =>
      vi.waitFor(() => {
        harness.detectChanges();
        check();
      });
    const button = (text: string) =>
      [...el().querySelectorAll('button')].find((b) => b.textContent?.trim() === text);
    return { el, settle, button };
  }

  it('lists friends with the streets you share', async () => {
    const { el, settle } = await open();
    await settle(() => expect(el().textContent).toContain('Sam Rivera'));
    expect(el().textContent).toContain('Friends since November 2026');
    expect(el().querySelector('.plaque')?.textContent?.trim()).toBe('Quillfeather Ln');
  });

  it('removes a friend after a confirming click', async () => {
    const { el, settle, button } = await open();
    await settle(() => expect(el().textContent).toContain('Sam Rivera'));

    (el().querySelector('[aria-label="Remove Sam Rivera"]') as HTMLButtonElement).click();
    await settle(() => expect(button('Remove for good')).toBeDefined());
    button('Remove for good')?.click();

    await settle(() =>
      expect(el().querySelector('.list')?.textContent).not.toContain('Sam Rivera'),
    );
    expect(el().querySelector('.list')?.textContent).toContain('Ida');
    expect(el().querySelector('[role=status]')?.textContent).toBe('Sam Rivera removed.');
    const deletes = fetchMock.mock.calls.filter(([, init]) => init?.method === 'DELETE');
    expect(deletes).toHaveLength(1);
  });

  it('makes a friend link to copy', async () => {
    const { el, settle, button } = await open();
    await settle(() => expect(button('Make a friend link')).toBeDefined());
    button('Make a friend link')?.click();

    await settle(() =>
      expect((el().querySelector('#friend-link') as HTMLInputElement)?.value).toBe(
        `${location.origin}/friend/F7QW2M9XRT`,
      ),
    );
  });

  it('says so when there are none yet', async () => {
    answers['GET /friends'] = [json(200, { data: [] })];
    const { el, settle } = await open();
    await settle(() => expect(el().textContent).toContain('No friends yet'));
  });
});
