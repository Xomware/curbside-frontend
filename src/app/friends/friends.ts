import { Injectable, inject } from '@angular/core';

import { Api } from '../api/api';
import { Invite } from '../sharing/sharing';

export interface Friend {
  account_id: string;
  display_name: string;
  since: string;
  shared_maps: { map_id: string; name: string }[];
}

export interface FriendInvitePreview {
  inviter: { display_name: string };
  expires_at: string;
}

/** Mutual connections across streets, made by a friend link (curbside-backend friends_*). */
@Injectable({ providedIn: 'root' })
export class Friends {
  private readonly api = inject(Api);

  list(): Promise<Friend[]> {
    return this.api.request('GET', '/friends');
  }

  remove(accountId: string): Promise<unknown> {
    return this.api.request('DELETE', `/friends/${accountId}`);
  }

  invite(): Promise<Invite> {
    return this.api.request('POST', '/friends/invites');
  }

  preview(code: string): Promise<FriendInvitePreview> {
    return this.api.request('GET', `/friends/invites/${encodeURIComponent(code)}`);
  }

  accept(code: string): Promise<Friend> {
    return this.api.request('POST', `/friends/invites/${encodeURIComponent(code)}/accept`);
  }
}

export function friendUrl(code: string): string {
  return `${location.origin}/friend/${code}`;
}
