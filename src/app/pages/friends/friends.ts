import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { Friend, Friends, friendUrl } from '../../friends/friends';
import { MapStore } from '../../map/map-store';
import { Invite, shareLink } from '../../sharing/sharing';
import { Loading } from '../../ui/loading';

/** `/friends`: people you can add to a street without an invite link, and the link that makes a new one. */
@Component({
  selector: 'xom-friends',
  imports: [Loading],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './friends.html',
  styleUrl: './friends.scss',
})
export class FriendsPage {
  private readonly friends = inject(Friends);
  private readonly map = inject(MapStore);
  private readonly router = inject(Router);

  protected readonly list = signal<Friend[] | null>(null);
  protected readonly failed = signal(false);
  protected readonly invite = signal<Invite | null>(null);
  protected readonly copied = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  /** The friend waiting on the confirming second click. */
  protected readonly removing = signal<string | null>(null);
  protected readonly status = signal('');
  protected readonly canShare = typeof navigator.share === 'function';
  protected readonly url = friendUrl;

  constructor() {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.failed.set(false);
    try {
      this.list.set(await this.friends.list());
    } catch (error) {
      console.error('Friends load failed', error);
      this.failed.set(true);
    }
  }

  protected async makeInvite(): Promise<void> {
    await this.run(async () => {
      this.invite.set(await this.friends.invite());
      this.copied.set(false);
    }, "Couldn't make a friend link.");
  }

  protected async copy(code: string): Promise<void> {
    await navigator.clipboard.writeText(friendUrl(code));
    this.copied.set(true);
  }

  protected share(code: string): Promise<void> {
    return shareLink('Be my friend on Curbside', friendUrl(code));
  }

  protected async remove(friend: Friend): Promise<void> {
    await this.run(async () => {
      await this.friends.remove(friend.account_id);
      this.list.update((all) => all?.filter((f) => f.account_id !== friend.account_id) ?? null);
      this.removing.set(null);
      this.status.set(`${friend.display_name} removed.`);
    }, `Couldn't remove ${friend.display_name}.`);
  }

  protected async openStreet(id: string): Promise<void> {
    await this.map.open(id);
    await this.router.navigateByUrl('/');
  }

  protected date(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  protected since(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  private async run(work: () => Promise<void>, failure: string): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await work();
    } catch (error) {
      console.error(failure, error);
      this.error.set(failure);
    } finally {
      this.busy.set(false);
    }
  }
}
