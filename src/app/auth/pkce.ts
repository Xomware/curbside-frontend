/** 32 bytes from the CSPRNG as base64url: 43 characters, the shortest verifier RFC 7636 allows. */
export function randomToken(): string {
  return base64Url(crypto.getRandomValues(new Uint8Array(32)));
}

export async function challenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64Url(new Uint8Array(digest));
}

function base64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
