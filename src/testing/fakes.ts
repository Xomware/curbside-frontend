import { Tokens } from '../app/auth/cognito';

/** An unsigned JWT carrying `claims`. The client only ever reads the payload. */
export function fakeJwt(claims: Record<string, unknown>): string {
  const part = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, '');
  return `${part({ alg: 'none' })}.${part(claims)}.sig`;
}

export function fakeTokens(username = 'google_1', refresh = 'refresh-1'): Tokens {
  const claims = { sub: `sub-${username}`, 'cognito:username': username };
  return { access: fakeJwt({ ...claims, n: refresh }), id: fakeJwt(claims), refresh };
}

export function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
