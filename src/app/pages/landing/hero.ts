import { ChangeDetectionStrategy, Component, afterNextRender, output, signal } from '@angular/core';

import { SignInButtons } from './sign-in-buttons';

/** The sign rises out of the sidewalk and settles, then the pitch and the sign-in buttons come in. */
@Component({
  selector: 'xom-landing-hero',
  imports: [SignInButtons],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.go]': 'go()' },
  template: `
    <div class="inner l-wrap">
      <div class="stage" aria-hidden="true">
        <img class="pole" src="pole.webp" width="668" height="830" alt="" />
        <i class="puff" style="--dx: -34px"></i>
        <i class="puff" style="--dx: 30px"></i>
        <i class="puff" style="--dx: -12px"></i>
      </div>
      <div class="copy">
        <p class="kicker" data-r style="--i: 0">A private map of your block</p>
        <h1 data-r style="--i: 1">Never blank on a <em>neighbor’s</em> name again.</h1>
        <p class="l-lede" data-r style="--i: 2">
          Curbside keeps who lives where, the kids’ names, the dog’s name and what they told you
          last time. Only you can see it.
        </p>
        <xom-sign-in-buttons data-r style="--i: 3" />
        <button class="cue" type="button" data-r style="--i: 4" (click)="more.emit()">
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <path
              d="M2 5l5 5 5-5"
              fill="none"
              stroke="currentColor"
              stroke-width="2.4"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          See how it works
        </button>
      </div>
    </div>
    <div class="ground" aria-hidden="true">
      <div class="walk"></div>
      <div class="curb"></div>
      <div class="road"></div>
    </div>
  `,
  styleUrl: './hero.scss',
})
export class LandingHero {
  readonly more = output();
  protected readonly go = signal(false);

  constructor() {
    afterNextRender(() => requestAnimationFrame(() => this.go.set(true)));
  }
}
