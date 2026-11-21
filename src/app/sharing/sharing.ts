import { Injectable, inject } from '@angular/core';

import { Api } from '../api/api';
import { Place } from '../map/models';

export interface Member {
  account_id: string;
  display_name: string;
  role: 'owner' | 'member';
  created_at: string;
}

export interface Invite {
  code: string;
  expires_at: string;
}

export interface InvitePreview extends Invite {
  map: { id: string; name: string };
  invited_by: string;
  already_member: boolean;
}

/** Street sharing: single-use invite links and the people on a street (curbside-backend invites_*, members_*). */
@Injectable({ providedIn: 'root' })
export class Sharing {
  private readonly api = inject(Api);

  members(mapId: string): Promise<Member[]> {
    return this.api.request('GET', `/maps/${mapId}/members`);
  }

  invite(mapId: string): Promise<Invite> {
    return this.api.request('POST', `/maps/${mapId}/invites`);
  }

  /** Puts a friend straight on the street; 200 with the existing member if they're already on it. */
  add(mapId: string, accountId: string): Promise<Member> {
    return this.api.request('POST', `/maps/${mapId}/members`, { account_id: accountId });
  }

  remove(mapId: string, accountId: string): Promise<unknown> {
    return this.api.request('DELETE', `/maps/${mapId}/members/${accountId}`);
  }

  preview(code: string): Promise<InvitePreview> {
    return this.api.request('GET', `/invites/${encodeURIComponent(code)}`);
  }

  accept(code: string): Promise<Place> {
    return this.api.request('POST', `/invites/${encodeURIComponent(code)}/accept`);
  }
}

export function inviteUrl(code: string): string {
  return `${location.origin}/invite/${code}`;
}

/** The system share sheet. */
export async function shareLink(text: string, url: string): Promise<void> {
  try {
    await navigator.share({ title: 'Curbside', text, url });
  } catch (error) {
    // Closing the share sheet rejects with AbortError; that's a choice, not a failure.
    if (!(error instanceof DOMException && error.name === 'AbortError')) throw error;
  }
}
