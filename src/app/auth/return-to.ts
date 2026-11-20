const KEY = 'curbside.return';

/** Where to land after a sign-in or onboarding detour, e.g. an invite link opened while signed out. */
export function rememberReturn(url: string): void {
  sessionStorage.setItem(KEY, url);
}

export function takeReturn(): string | null {
  const url = sessionStorage.getItem(KEY);
  sessionStorage.removeItem(KEY);
  return url;
}
