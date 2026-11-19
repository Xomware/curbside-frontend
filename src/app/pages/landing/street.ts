import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';

import { Reveal } from './reveal';

type House = {
  x: number;
  y: number;
  w: number;
  h: number;
  acc: boolean;
  num: string;
  name: string | null;
};

const house = (
  x: number,
  y: number,
  w: number,
  h: number,
  acc: boolean,
  num: string,
  name: string | null,
): House => ({
  x,
  y,
  w,
  h,
  acc,
  num,
  name,
});

// A made-up block on a 640×420 plan: four lots each side of the street.
const HOUSES: House[] = [
  house(24, 34, 104, 84, false, '11', 'Pumpernickel'),
  house(186, 42, 94, 74, true, '13', 'Fizzwhistle'),
  house(344, 30, 110, 88, false, '15', null),
  house(508, 40, 100, 76, true, '17', 'Quillby'),
  house(30, 300, 96, 78, true, '12', 'Mossbottom'),
  house(188, 294, 106, 88, false, '14', null),
  house(352, 304, 92, 72, false, '16', 'Crumpet'),
  house(500, 296, 112, 84, true, '18', null),
];
const TREES = [
  [150, 22, 18],
  [318, 128, 15],
  [470, 20, 20],
  [628, 128, 17],
  [6, 404, 18],
  [166, 404, 16],
  [462, 410, 20],
  [628, 396, 15],
  [8, 130, 14],
];

/** OSM footprints become a street of roofs; plaques go up; one blank house gets its name while you watch. */
@Component({
  selector: 'xom-landing-street',
  hostDirectives: [Reveal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './street.html',
  styleUrl: './street.scss',
})
export class LandingStreet {
  protected readonly houses = HOUSES;
  protected readonly trees = TREES;
  protected readonly lots = [0, 1, 2, 3];
  protected readonly named = signal(false);

  constructor() {
    const reveal = inject(Reveal);
    let timer: ReturnType<typeof setTimeout> | undefined;
    inject(DestroyRef).onDestroy(() => clearTimeout(timer));
    effect(() => {
      if (!reveal.seen()) return;
      timer = setTimeout(() => this.named.set(true), reveal.animate() ? 3400 : 0);
    });
  }

  protected roof(h: House): string {
    const m = Math.min(h.w, h.h) / 2;
    const cy = h.y + h.h / 2;
    return `M${h.x} ${h.y}L${h.x + m} ${cy}L${h.x} ${h.y + h.h}M${h.x + h.w} ${h.y}L${h.x + h.w - m} ${cy}L${h.x + h.w} ${h.y + h.h}M${h.x + m} ${cy}H${h.x + h.w - m}`;
  }

  protected name(h: House): string | null {
    return h.num === '15' && this.named() ? 'Hollyhock' : h.name;
  }
}
