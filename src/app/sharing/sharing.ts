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
