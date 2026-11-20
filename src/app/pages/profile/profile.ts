import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AccountStore } from '../../account/account-store';
import { AuthSession } from '../../auth/auth-session';
import { talked } from '../../household/format';
import { houseNumber } from '../../map/geo';
import { MapStore } from '../../map/map-store';
import { Household } from '../../map/models';
import { Loading } from '../../ui/loading';
import { StreetSharing } from '../../sharing/street-sharing';
import { Plaque } from '../../ui/plaque';

const MONTH_MS = 30 * 86_400_000;

/** Who you are on Curbside and how your street is going: counts, and the neighbors you're due to say hello to. */
@Component({
  selector: 'xom-profile',
  imports: [Loading, Plaque, ReactiveFormsModule, RouterLink, StreetSharing],
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
  protected readonly editing = signal(false);
  protected readonly saving = signal(false);
  protected readonly renameFailed = signal(false);
  // The API takes 1-80 characters after trimming.
  protected readonly name = inject(NonNullableFormBuilder).control('', [
    Validators.required,
    Validators.maxLength(80),
    Validators.pattern(/\S/),
  ]);

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

  protected edit(): void {
    this.name.setValue(this.account.account()?.display_name ?? '');
    this.renameFailed.set(false);
    this.editing.set(true);
  }

  // A plain (submit): ngSubmit needs a [formGroup] on the form, and this one holds a lone control.
  protected async rename(event: Event): Promise<void> {
    event.preventDefault();
    if (this.name.invalid) return;
    this.saving.set(true);
    this.renameFailed.set(false);
    try {
      await this.account.rename(this.name.value.trim());
      this.editing.set(false);
    } catch (error) {
      console.error('Rename failed', error);
      this.renameFailed.set(true);
    } finally {
      this.saving.set(false);
    }
  }

  protected signOut(): void {
    this.auth.logOut();
  }
}
