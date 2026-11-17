import { challenge, randomToken } from './pkce';

describe('pkce', () => {
  // Expected value from: printf %s <verifier> | openssl dgst -sha256 -binary | base64 | tr '+/' '-_' | tr -d =
  it('is the base64url SHA-256 of the verifier', async () => {
    expect(await challenge('dBjftJeZ4CVP-mJ92K9UGh8hPnT8VEpAG7f6Mts6tHo')).toBe(
      'FGdc8UDO-QsyacopJlh2Mw2iAycmLtDLTYo4Q3SBR6k',
    );
  });

  it('makes 43-character base64url verifiers that differ', () => {
    const a = randomToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(randomToken()).not.toBe(a);
  });
});
