import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { AccountStore } from '../../account/account-store';

/** Placeholder until the map lands (WEB-2). */
@Component({
  selector: 'xom-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="page">
      <h1 class="sign">{{ store.account()?.display_name }}</h1>
      <p>The street map comes to the web next. Until then, add houses from the iPhone app.</p>
    </main>
  `,
})
export class HomePage {
  protected readonly store = inject(AccountStore);
}
