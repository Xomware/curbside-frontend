import { Injectable, inject } from '@angular/core';

import { Api } from '../api/api';

export interface AdminStats {
  accounts: number;
  maps: number;
  households: number;
  people: number;
  pets: number;
  notes: number;
  friendships: number;
  devices: number;
  open_invites: number;
}

export interface AdminAccount {
  account_id: string;
  display_name: string;
  created_at: string;
  providers: string[];
  map_count: number;
}

export interface AdminMap {
  map_id: string;
  name: string;
  created_at: string;
  owner_name: string;
  member_count: number;
  household_count: number;
}

/** curbside-backend admin_*: 403 `admin_only` for anyone without `is_admin`. */
@Injectable({ providedIn: 'root' })
export class AdminApi {
  private readonly api = inject(Api);

  stats(): Promise<AdminStats> {
    return this.api.request('GET', '/admin/stats');
  }

  accounts(): Promise<AdminAccount[]> {
    return this.api.request('GET', '/admin/accounts');
  }

  maps(): Promise<AdminMap[]> {
    return this.api.request('GET', '/admin/maps');
  }

  deleteMap(mapId: string): Promise<unknown> {
    return this.api.request('DELETE', `/admin/maps/${mapId}`);
  }
}
