import { Injectable, inject, signal } from '@angular/core';

import { Api } from '../api/api';

export interface ActivityItem {
  id: string;
  kind: string;
  actor_name: string;
  map_id?: string;
  map_name?: string;
  household_label?: string;
  created_at: string;
}

interface Feed {
  items: ActivityItem[];
  /** The newest `unread` items arrived after the last POST /activity/seen. */
  unread: number;
}

/** The activity feed and its unread count, which the shell's nav badge shows. */
@Injectable({ providedIn: 'root' })
export class ActivityStore {
  private readonly api = inject(Api);

  readonly items = signal<ActivityItem[] | null>(null);
  readonly unread = signal(0);
  readonly failed = signal(false);

  /** Resolves to the unread count at load time, or null when the load failed. */
  async load(): Promise<number | null> {
    this.failed.set(false);
    try {
      const feed = await this.api.request<Feed>('GET', '/activity');
      this.items.set(feed.items);
      this.unread.set(feed.unread);
      return feed.unread;
    } catch (error) {
      console.error('Activity load failed', error);
      this.failed.set(true);
      return null;
    }
  }

  async markSeen(): Promise<void> {
    await this.api.request('POST', '/activity/seen');
    this.unread.set(0);
  }
}
