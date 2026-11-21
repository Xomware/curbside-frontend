import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { answerBy, fakeTokens, json } from '../../../testing/fakes';
import { routes } from '../../app.routes';
import { AuthSession } from '../../auth/auth-session';
import { takeReturn } from '../../auth/return-to';

describe('FriendInvitePage', () => {
  let answers: Record<string, Response[]>;
  let fetchMock: ReturnType<typeof vi.fn>;
  const sam = {
    account_id: 'b',
    display_name: 'Sam',
    since: '2026-11-20T00:00:00Z',
    shared_maps: [],
  };

  beforeEach(() => {
    sessionStorage.clear();
    answers = {
      'GET /me': [json(200, { data: { account_id: 'a', display_name: 'Dom', identities: [] } })],
      'GET /activity': [json(200, { data: { items: [], unread: 0 } })],
      'GET /friends/invites/F7QW2M9XRT': [
        json(200, {
          data: { inviter: { display_name: 'Sam' }, expires_at: '2026-11-27T00:00:00Z' },
        }),
      ],
      'POST /friends/invites/F7QW2M9XRT/accept': [json(200, { data: sam })],
      'GET /friends': [json(200, { data: [sam] })],
    };
    fetchMock = vi.fn(answerBy(answers));
    vi.stubGlobal('fetch', fetchMock);
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
  });
  afterEach(() => vi.unstubAllGlobals());

  async function open() {
    const harness = await RouterTestingHarness.create('/friend/F7QW2M9XRT');
    const el = () => harness.routeNativeElement as HTMLElement;
    const settle = (text: string) =>
      vi.waitFor(() => {
        harness.detectChanges();
        expect(el().textContent).toContain(text);
      });
    const button = (text: string) =>
      [...el().querySelectorAll('button')].find((b) => b.textContent?.trim() === text);
    return { el, settle, button };
  }

  it('signed out: asks for a sign-in and comes back here after', async () => {
    const { settle } = await open();
    await settle('Friend request');
    expect(takeReturn()).toBe('/friend/F7QW2M9XRT');
  });

  it('makes you friends on the click and opens your friends', async () => {
    TestBed.inject(AuthSession).adopt(fakeTokens());
    const { settle, button } = await open();
    await settle('Sam');
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);

    button('Be friends')?.click();
    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/friends'));
  });

  it('tells you when the link is your own', async () => {
    answers['POST /friends/invites/F7QW2M9XRT/accept'] = [
      json(409, { error: { code: 'own_invite', message: 'yours' } }),
    ];
    TestBed.inject(AuthSession).adopt(fakeTokens());
    const { settle, button } = await open();
    await settle('Be friends');
    button('Be friends')?.click();
    await settle("That's your link");
  });

  it('says so when the link is used up', async () => {
    answers['GET /friends/invites/F7QW2M9XRT'] = [
      json(404, { error: { code: 'invite_not_found', message: 'gone' } }),
    ];
    TestBed.inject(AuthSession).adopt(fakeTokens());
    const { settle } = await open();
    await settle('Link used up');
  });
});
