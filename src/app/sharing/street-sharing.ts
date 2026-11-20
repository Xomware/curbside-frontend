import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';

import { MapStore } from '../map/map-store';
import { Place } from '../map/models';
import { Invite, Member, Sharing, inviteUrl } from './sharing';

/** Who's on a street. The owner makes single-use invite links and removes people; a member can leave. */
@Component({
  selector: 'xom-street-sharing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './street-sharing.html',
  styleUrl: './street-sharing.scss',
})
export class StreetSharing {
  private readonly sharing = inject(Sharing);
  private readonly map = inject(MapStore);

  readonly place = input.required<Place>();
  readonly accountId = input.required<string>();

  protected readonly members = signal<Member[] | null>(null);
  protected readonly invite = signal<Invite | null>(null);
  protected readonly copied = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly confirmLeave = signal(false);
  protected readonly canShare = typeof navigator.share === 'function';
  protected readonly url = inviteUrl;

  constructor() {
    effect(() => {
      const id = this.place().id;
      this.invite.set(null);
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

  protected async share(code: string): Promise<void> {
    try {
      await navigator.share({
        title: 'Curbside',
        text: `Join ${this.place().name} on Curbside`,
        url: inviteUrl(code),
      });
    } catch (error) {
      // Closing the share sheet rejects with AbortError; that's a choice, not a failure.
      if (!(error instanceof DOMException && error.name === 'AbortError')) throw error;
    }
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
