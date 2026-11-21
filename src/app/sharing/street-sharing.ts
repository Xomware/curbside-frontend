import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { Friend, Friends } from '../friends/friends';
import { MapStore } from '../map/map-store';
import { Place } from '../map/models';
import { Invite, Member, Sharing, inviteUrl, shareLink } from './sharing';

/**
 * Who's on a street. The owner makes single-use invite links and removes people; a member can leave. Anyone on it
 * can add a friend directly.
 */
@Component({
  selector: 'xom-street-sharing',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './street-sharing.html',
  styleUrl: './street-sharing.scss',
})
export class StreetSharing {
  private readonly sharing = inject(Sharing);
  private readonly map = inject(MapStore);
  private readonly friendsApi = inject(Friends);

  readonly place = input.required<Place>();
  readonly accountId = input.required<string>();

  protected readonly members = signal<Member[] | null>(null);
  protected readonly invite = signal<Invite | null>(null);
  protected readonly copied = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly confirmLeave = signal(false);
  /** Null until "Add a friend" opens the picker. */
  protected readonly friends = signal<Friend[] | null>(null);
  protected readonly picking = signal(false);
  protected readonly addable = computed(() => {
    const on = new Set(this.members()?.map((m) => m.account_id));
    return (this.friends() ?? []).filter((f) => !on.has(f.account_id));
  });
  protected readonly canShare = typeof navigator.share === 'function';
  protected readonly url = inviteUrl;

  constructor() {
    effect(() => {
      const id = this.place().id;
      this.invite.set(null);
      this.picking.set(false);
      void this.load(id);
    });
  }

  private async load(mapId: string): Promise<void> {
    this.members.set(null);
    this.error.set(null);
    try {
      this.members.set(await this.sharing.members(mapId));
    } catch (error) {
      console.error('Members load failed', error);
      this.error.set("Couldn't load who's on this street.");
    }
  }

  protected async makeInvite(): Promise<void> {
    await this.run(async () => {
      this.invite.set(await this.sharing.invite(this.place().id));
      this.copied.set(false);
    }, "Couldn't make an invite link.");
  }

  protected async copy(code: string): Promise<void> {
    await navigator.clipboard.writeText(inviteUrl(code));
    this.copied.set(true);
  }

  protected share(code: string): Promise<void> {
    return shareLink(`Join ${this.place().name} on Curbside`, inviteUrl(code));
  }

  protected async pickFriend(): Promise<void> {
    await this.run(async () => {
      this.friends.set(await this.friendsApi.list());
      this.picking.set(true);
    }, "Couldn't load your friends.");
  }

  protected async addFriend(friend: Friend): Promise<void> {
    await this.run(async () => {
      const member = await this.sharing.add(this.place().id, friend.account_id);
      this.members.update((all) =>
        all?.some((m) => m.account_id === member.account_id) ? all : [...(all ?? []), member],
      );
    }, `Couldn't add ${friend.display_name}.`);
  }

  protected async remove(member: Member): Promise<void> {
    await this.run(async () => {
      await this.sharing.remove(this.place().id, member.account_id);
      this.members.update((all) => all?.filter((m) => m.account_id !== member.account_id) ?? null);
    }, `Couldn't remove ${member.display_name}.`);
  }

  protected async leave(): Promise<void> {
    await this.run(async () => {
      await this.sharing.remove(this.place().id, this.accountId());
      await this.map.open(null);
    }, "Couldn't leave this street.");
  }

  protected expires(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
