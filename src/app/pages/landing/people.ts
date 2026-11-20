import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';

import { Reveal } from './reveal';

/** One household card filling in: the name blade, then people, kids, pets and the last thing said. */
@Component({
  selector: 'xom-landing-people',
  hostDirectives: [Reveal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './people.html',
  styleUrl: './people.scss',
})
export class LandingPeople {
  protected readonly age = signal(8);

  constructor() {
    const reveal = inject(Reveal);
    let timer: ReturnType<typeof setInterval> | undefined;
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
    effect(() => {
      if (!reveal.seen() || !reveal.animate()) return;
      this.age.set(0);
      setTimeout(() => {
        timer = setInterval(() => {
          this.age.update((n) => n + 1);
          if (this.age() >= 8) clearInterval(timer);
        }, 70);
      }, 1100);
    });
  }
}
