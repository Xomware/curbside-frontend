import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { ActivityItem, ActivityStore } from '../../activity/activity-store';
import { activityText, ago, opensStreet } from '../../activity/text';
import { MapStore } from '../../map/map-store';
import { Loading } from '../../ui/loading';

/** `/activity`: what happened on your streets and with your friends. Opening it marks everything read. */
@Component({
  selector: 'xom-activity',
  imports: [Loading],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './activity.html',
  styleUrl: './activity.scss',
})
export class ActivityPage {
  protected readonly store = inject(ActivityStore);
  private readonly map = inject(MapStore);
  private readonly router = inject(Router);
  protected readonly text = activityText;
  protected readonly ago = ago;
  protected readonly opensStreet = opensStreet;
  /** How many of the newest items to flag as new; kept after the seen POST zeroes the badge. */
  protected readonly fresh = signal(0);

  constructor() {
    void this.load();
  }

  protected async load(): Promise<void> {
    const unread = await this.store.load();
    if (!unread) return;
    this.fresh.set(unread);
    try {
      await this.store.markSeen();
    } catch (error) {
      console.error('Marking activity seen failed', error);
    }
  }

  protected async open(item: ActivityItem): Promise<void> {
    await this.map.open(item.map_id ?? null);
    await this.router.navigateByUrl('/');
  }
}
