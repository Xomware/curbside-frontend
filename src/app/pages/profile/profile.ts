import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AccountStore } from '../../account/account-store';
import { AuthSession } from '../../auth/auth-session';
import { talked } from '../../household/format';
import { houseNumber } from '../../map/geo';
import { MapStore } from '../../map/map-store';
import { Household } from '../../map/models';
import { Loading } from '../../ui/loading';
import { Plaque } from '../../ui/plaque';

const MONTH_MS = 30 * 86_400_000;

/** Who you are on Curbside and how your street is going: counts, and the neighbors you're due to say hello to. */
@Component({
  selector: 'xom-profile',
  imports: [Loading, Plaque, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class ProfilePage {
  private readonly auth = inject(AuthSession);
  protected readonly account = inject(AccountStore);
  protected readonly map = inject(MapStore);
  protected readonly number = (h: Household) => houseNumber(h.private.address);
  protected readonly talked = talked;

  protected readonly initials = computed(() =>
    (this.account.account()?.display_name ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0].toUpperCase())
      .join(''),
  );

  protected readonly since = computed(() => {
    const created = this.account.account()?.created_at;
    return created
      ? new Date(created).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : '';
  });

  protected readonly providers = computed(() =>
    (this.account.account()?.identities ?? []).map((i) =>
      i.provider === 'apple' ? 'Apple' : 'Google',
    ),
  );

  protected readonly stats = computed(() => {
    const homes = this.map.households();
    const cutoff = Date.now() - MONTH_MS;
    return [
      { label: 'Homes', value: homes.length },
      { label: 'People', value: homes.reduce((n, h) => n + (h.private.people?.length ?? 0), 0) },
      { label: 'Pets', value: homes.reduce((n, h) => n + (h.private.pets?.length ?? 0), 0) },
      {
        label: 'Talked this month',
        value: homes.filter(
          (h) => h.private.last_talked_at && Date.parse(h.private.last_talked_at) >= cutoff,
        ).length,
      },
    ];
  });

  /** Never talked first, then longest ago. */
  protected readonly due = computed(() =>
    [...this.map.households()]
      .sort(
        (a, b) =>
          (a.private.last_talked_at ? Date.parse(a.private.last_talked_at) : 0) -
          (b.private.last_talked_at ? Date.parse(b.private.last_talked_at) : 0),
      )
      .slice(0, 3),
  );

  constructor() {
    void this.map.ensure();
  }

  protected signOut(): void {
    this.auth.logOut();
  }
}
