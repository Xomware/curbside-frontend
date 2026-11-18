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

/**
 * A fetch body that answers by "METHOD /path" (path after /v1), so the order of independent requests, like the
 * shell's GET /me beside a page's own calls, doesn't matter. Each key holds a queue; the last answer repeats.
 * Wrap it in vi.fn() to inspect calls.
 */
export function answerBy(answers: Record<string, Response[]>) {
  return async (url: string, init?: RequestInit): Promise<Response> => {
    const key = `${init?.method ?? 'GET'} ${new URL(url).pathname.replace(/^\/v1/, '')}`;
    const queue = answers[key] ?? [];
    const answer = queue.length > 1 ? queue.shift() : queue[0];
    if (!answer) throw new Error(`No answer for ${key}`);
    return answer.clone();
  };
}
