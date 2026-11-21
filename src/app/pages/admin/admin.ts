import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { AdminAccount, AdminApi, AdminMap, AdminStats } from '../../admin/admin-api';
import { Loading } from '../../ui/loading';

const STAT_LABELS: [keyof AdminStats, string][] = [
  ['accounts', 'Accounts'],
  ['maps', 'Streets'],
  ['households', 'Households'],
  ['people', 'People'],
  ['pets', 'Pets'],
  ['notes', 'Notes'],
  ['friendships', 'Friendships'],
  ['devices', 'Devices'],
  ['open_invites', 'Open invites'],
];

/** `/admin`: counts across the table, every account, and every street, which can be deleted. */
@Component({
  selector: 'xom-admin',
  imports: [Loading],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin.html',
  styleUrl: './admin.scss',
})
export class AdminPage {
  private readonly api = inject(AdminApi);

  protected readonly labels = STAT_LABELS;
  protected readonly stats = signal<AdminStats | null>(null);
  protected readonly accounts = signal<AdminAccount[] | null>(null);
  protected readonly maps = signal<AdminMap[] | null>(null);
  protected readonly failed = signal(false);
  /** The street waiting on its confirming second click. */
  protected readonly deleting = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly status = signal('');

  constructor() {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.failed.set(false);
    try {
      const [stats, accounts, maps] = await Promise.all([
        this.api.stats(),
        this.api.accounts(),
        this.api.maps(),
      ]);
      this.stats.set(stats);
      this.accounts.set(accounts);
      this.maps.set(maps);
    } catch (error) {
      console.error('Admin load failed', error);
      this.failed.set(true);
    }
  }

  protected async remove(map: AdminMap): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.api.deleteMap(map.map_id);
      this.maps.update((all) => all?.filter((m) => m.map_id !== map.map_id) ?? null);
      this.deleting.set(null);
      this.status.set(`${map.name} deleted.`);
      this.stats.set(await this.api.stats());
    } catch (error) {
      console.error('Admin street delete failed', error);
      this.error.set(`Couldn't delete ${map.name}.`);
    } finally {
      this.busy.set(false);
    }
  }

  protected date(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  protected providers(account: AdminAccount): string {
    return account.providers
      .map((p) => (p === 'apple' ? 'Apple' : p === 'google' ? 'Google' : p))
      .join(', ');
  }
}
