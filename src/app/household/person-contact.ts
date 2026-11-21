import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { Person } from '../map/models';
import { downloadVcard } from './vcard';

/** Call and email links under a person on the card, and a .vcf for the address book. */
@Component({
  selector: 'xom-person-contact',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let p = person();
    @if (p.phone || p.email) {
      <p class="contact">
        @if (p.phone) {
          <a [href]="'tel:' + p.phone">{{ p.phone }}</a>
        }
        @if (p.email) {
          <a [href]="'mailto:' + p.email">{{ p.email }}</a>
        }
        <button class="btn-text" type="button" (click)="save()">Save contact</button>
      </p>
    }
  `,
  styles: `
    .contact {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0 var(--space-3);
      margin: calc(-1 * var(--space-1)) 0 var(--space-1);
      font-size: 14px;
    }

    a {
      display: inline-flex;
      align-items: center;
      min-height: 36px;
      color: var(--ink);
      font-weight: 700;
      text-underline-offset: 3px;
      overflow-wrap: anywhere;
    }

    .btn-text {
      min-height: 36px;
      margin-left: calc(-1 * var(--space-2));
      font-size: 13px;
    }
  `,
})
export class PersonContact {
  readonly person = input.required<Person>();
  readonly address = input<string | null>(null);

  protected save(): void {
    downloadVcard(this.person(), this.address());
  }
}
