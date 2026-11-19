import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';

import { Reveal } from './reveal';

// What was said, with the phrases Curbside pulls out numbered the way the capture screen numbers them.
const SAID: [string, number?][] = [
  ['Ran into '],
  ['Clementine Pumpernickel', 1],
  [' walking Waffles. '],
  ['Odo just turned five', 2],
  [' and '],
  ['starts kindergarten in the fall', 3],
  ['. Marguerite next door '],
  ['got a second cat named Pickles', 4],
  ['.'],
];
const TOTAL = SAID.reduce((n, [t]) => n + t.length, 0);
const OPS = 4;

/** A capture played back: the stop sign, the words typing out, then each proposed change checking itself. */
@Component({
  selector: 'xom-landing-talk',
  hostDirectives: [Reveal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './talk-demo.html',
  styleUrl: './talk-demo.scss',
})
export class LandingTalk {
  private readonly reveal = inject(Reveal);
  private timers: ReturnType<typeof setTimeout>[] = [];

  // At rest the capture is finished, so a reduced-motion visit shows the whole thing.
  protected readonly typed = signal(TOTAL);
  protected readonly lit = signal(4);
  protected readonly shown = signal(OPS);
  protected readonly checked = signal(3);
  protected readonly ahead = signal(true);
  protected readonly done = signal(true);
  protected readonly listening = signal(false);
  protected readonly seconds = signal(9);
  protected readonly pressed = signal(false);
  protected readonly bars = Array.from(
    { length: 40 },
    (_, i) => 30 + Math.round(Math.abs(Math.sin(i * 1.7)) * 70),
  );

  protected readonly segments = computed(() => {
    let left = this.typed();
    return SAID.map(([text, mark]) => {
      const shown = text.slice(0, Math.max(0, left));
      left -= text.length;
      return { text: shown, mark };
    });
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
    effect(() => {
      if (this.reveal.seen() && this.reveal.animate()) this.at(600, () => this.play());
    });
  }

  protected play(): void {
    if (!this.reveal.animate()) return;
    this.stop();
    this.typed.set(0);
    this.lit.set(0);
    this.shown.set(0);
    this.checked.set(0);
    this.ahead.set(false);
    this.done.set(false);
    this.seconds.set(0);
    this.listening.set(true);
    this.pressed.set(false);
    this.at(0, () => this.pressed.set(true));

    let t = 350;
    for (let i = 1; i <= 9; i++) this.at(i * 380, () => this.seconds.set(i));
    for (let n = 1; n <= TOTAL; n++) this.at((t += 18), () => this.typed.set(n));
    this.at((t += 300), () => this.listening.set(false));
    for (let n = 1; n <= 4; n++) this.at((t += 260), () => this.lit.set(n));
    this.at((t += 350), () => this.ahead.set(true));
    for (let n = 1; n <= OPS; n++) {
      this.at((t += 320), () => this.shown.set(n));
      if (n <= 3) this.at(t + 220, () => this.checked.set(n));
    }
    this.at((t += 600), () => this.done.set(true));
  }

  private at(ms: number, fn: () => void): void {
    this.timers.push(setTimeout(fn, ms));
  }

  private stop(): void {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }
}
