import { ApiError } from '../api/api';
import { AuthError } from '../auth/cognito';

/** What to tell the person when a sign-in, link or account call fails. */
export function failureMessage(error: unknown): string {
  if (error instanceof AuthError) return "Sign-in didn't finish. Try again.";
  if (!(error instanceof ApiError))
    return "Couldn't reach Curbside. Check your connection and try again.";
  switch (error.code) {
    case 'needs_onboarding':
      return "That sign-in doesn't have a Curbside account either. Pick the one you set Curbside up with.";
    case 'identity_in_use':
      return "That sign-in has its own Curbside account. Accounts can't be merged: export and delete one first.";
    case 'signed_out':
      return 'Your session ended. Sign in again.';
    default:
      return "Curbside couldn't do that. Try again.";
  }
}
