import { ChangeDetectionStrategy, Component, computed, output, signal } from '@angular/core';

import { Plaque } from '../ui/plaque';

interface Card {
  title: string;
  body: string;
  /** What the card's plaque reads; null is the empty "+ Add" blade. */
  plaque: { number: string | null; name: string | null } | 'sign';
}

const CARDS: Card[] = [
  {
    title: 'Tap a house',
    body: 'Its sign opens the card: who lives there, their kids and pets, and what you last talked about.',
    plaque: { number: '11', name: 'Pumpernickel' },
  },
  {
    title: 'Tap anywhere to add a neighbor',
    body: 'Tap any spot on the map, put a name on the sign, then add the people and pets you meet.',
    plaque: { number: null, name: null },
  },
  {
    title: 'Share the street',
    body: 'Profile has an invite link. Neighbors who join see and edit the same map, and nobody else can.',
    plaque: 'sign',
  },
];

/** Three cards on how the map works, any of them skippable. Shown once per browser. */
@Component({
  selector: 'xom-tour',
  imports: [Plaque],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let card = current();
    <section class="card" aria-live="polite" aria-labelledby="tour-heading">
      <div class="art" aria-hidden="true">
        @if (card.plaque === 'sign') {
          <span class="sign sign--small">Quillfeather Ln</span>
        } @else {
          <xom-plaque [number]="card.plaque.number" [name]="card.plaque.name" />
        }
      </div>
      <p class="eyebrow">{{ at() + 1 }} of {{ cards.length }}</p>
      <h2 id="tour-heading" class="lead">{{ card.title }}</h2>
      <p>{{ card.body }}</p>
    </section>

    <div class="nav">
      @if (at() > 0) {
        <button class="btn" type="button" (click)="at.set(at() - 1)">Back</button>
      }
      @if (last()) {
        <button class="btn btn--green" type="button" (click)="done.emit()">Open my street</button>
      } @else {
        <button class="btn btn--green" type="button" (click)="at.set(at() + 1)">Next</button>
      }
    </div>
    @if (!last()) {
      <button class="btn-text skip" type="button" (click)="done.emit()">Skip the tour</button>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    .card {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      padding: var(--space-4) var(--space-3);
      border-radius: 12px;
      background: var(--surface);
      box-shadow: 0 0 0 1px var(--rule);
    }

    .art {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 96px;
      margin-bottom: var(--space-2);
      border-radius: 8px;
      background: var(--bg);
    }

    .nav {
      display: flex;
      gap: var(--space-2);
    }

    .skip {
      align-self: center;
    }
  `,
})
export class Tour {
  readonly done = output();
  protected readonly cards = CARDS;
  protected readonly at = signal(0);
  protected readonly current = computed(() => CARDS[this.at()]);
  protected readonly last = computed(() => this.at() === CARDS.length - 1);
}
