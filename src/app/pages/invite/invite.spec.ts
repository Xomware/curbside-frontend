import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { answerBy, fakeTokens, json } from '../../../testing/fakes';
import { place } from '../../../testing/map-fixtures';
import { routes } from '../../app.routes';
import { AuthSession } from '../../auth/auth-session';
import { takeReturn } from '../../auth/return-to';
import { MapStore } from '../../map/map-store';

describe('InvitePage', () => {
  const shared = { ...place, id: 'map2', name: 'Birch Ct', role: 'member' };
  let answers: Record<string, Response[]>;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    answers = {
      'GET /me': [json(200, { data: { account_id: 'a', display_name: 'Dom', identities: [] } })],
      'GET /invites/K7QW2M9XRT': [
        json(200, {
          data: {
            code: 'K7QW2M9XRT',
            map: { id: 'map2', name: 'Birch Ct' },
            invited_by: 'Sam',
            expires_at: '2026-11-27T00:00:00Z',
            already_member: false,
          },
        }),
      ],
      'POST /invites/K7QW2M9XRT/accept': [json(200, { data: shared })],
      'GET /maps': [json(200, { data: [place, shared] })],
      'GET /maps/map2': [json(200, { data: { map: shared, households: [] } })],
      'GET /maps/map2/footprints': [json(202, { data: { status: 'pending' } })],
    };
    fetchMock = vi.fn(answerBy(answers));
    vi.stubGlobal('fetch', fetchMock);
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
  });
  afterEach(() => vi.unstubAllGlobals());

  async function open() {
    const harness = await RouterTestingHarness.create('/invite/K7QW2M9XRT');
    const el = () => harness.routeNativeElement as HTMLElement;
    const settle = (text: string) =>
      vi.waitFor(() => {
        harness.detectChanges();
        expect(el().textContent).toContain(text);
      });
    return { el, settle };
  }

  it('signed out: asks for a sign-in and comes back here after', async () => {
    const { settle } = await open();
    await settle("You're invited");
    expect(takeReturn()).toBe('/invite/K7QW2M9XRT');
  });

  it('joins the street on the click and opens it', async () => {
    TestBed.inject(AuthSession).adopt(fakeTokens());
    const { el, settle } = await open();
    await settle('Sam invited you to');
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);

    [...el().querySelectorAll('button')].find((b) => b.textContent?.includes('Join'))?.click();
    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/'));
    expect(TestBed.inject(MapStore).place()?.name).toBe('Birch Ct');
    expect(localStorage.getItem('curbside.map')).toBe('map2');
  });

  it('says so when the invite is used up', async () => {
    answers['GET /invites/K7QW2M9XRT'] = [
      json(404, { error: { code: 'invite_not_found', message: 'gone' } }),
    ];
    TestBed.inject(AuthSession).adopt(fakeTokens());
    const { settle } = await open();
    await settle('Invite used up');
  });
});
