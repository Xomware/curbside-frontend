import { ChangeDetectionStrategy, Component } from '@angular/core';

import { Reveal } from './reveal';

const NW = 'M27 27L9 9M9 9v12M9 9h12';
const NE = 'M7 27L25 9M25 9v12M25 9H13';

/** Near me as an overhead gantry: the houses you're passing swing down, closest first. */
@Component({
  selector: 'xom-landing-near',
  hostDirectives: [Reveal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="l-wrap l-duo l-duo--flip">
      <div>
        <span class="l-step" data-in><b>04</b>Near me</span>
        <h2 class="l-big" data-in style="--i: 1">Blanking mid-wave? Check the signs.</h2>
        <p class="l-lede" data-in style="--i: 2">
          Open Near me on a walk and the houses you’re passing line up, closest first, with who
          lives there. Say hi like you never forgot.
        </p>
      </div>
      <div class="gantry" aria-label="Example of Near me">
        <div class="beam"></div>
        <ol>
          @for (s of signs; track s.name) {
            <li [style.--i]="$index">
              <svg width="40" height="40" viewBox="0 0 34 34" aria-hidden="true">
                <path [attr.d]="s.arrow" />
              </svg>
              <div>
                <b>{{ s.name }}</b>
                <span>
                  @for (w of s.who; track w) {
                    @if (!$first) {
                      <i class="l-dot"></i>
                    }
                    {{ w }}
                  }
                </span>
              </div>
              <span class="tab">{{ s.ft }} FT</span>
              @if ($first) {
                <span class="next">Next house<i class="l-dot"></i>talked 6 days ago</span>
              }
            </li>
          }
        </ol>
      </div>
    </div>
  `,
  styleUrl: './near.scss',
})
export class LandingNear {
  protected readonly signs = [
    {
      arrow: NW,
      name: '11 Pumpernickel',
      who: ['Barnaby, Clementine', 'Juniper, Odo', 'Waffles'],
      ft: 40,
    },
    { arrow: NE, name: '12 Mossbottom', who: ['Ines', 'moved in this spring'], ft: 90 },
    {
      arrow: NW,
      name: '13 Fizzwhistle',
      who: ['Marguerite', 'Pickles and Biscuit, cats'],
      ft: 150,
    },
  ];
}
