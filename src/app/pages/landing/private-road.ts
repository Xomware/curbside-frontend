import { ChangeDetectionStrategy, Component } from '@angular/core';

import { Reveal } from './reveal';

/** The privacy promises as regulatory signs. Wording tracks /privacy; change both together. */
@Component({
  selector: 'xom-landing-private',
  hostDirectives: [Reveal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="l-wrap">
      <span class="l-step" data-in><b>05</b>Private road</span>
      <h2 class="l-big" data-in style="--i: 1">Your notes. Nobody else’s.</h2>
      <p class="l-lede" data-in style="--i: 2">
        Nobody on your street is told, and nobody else can open your map.
      </p>
      <ul>
        @for (r of rules; track r.title) {
          <li [class.warn]="r.warn" [style.--i]="$index">
            <h3>{{ r.title }}</h3>
            <p>{{ r.body }}</p>
          </li>
        }
      </ul>
    </div>
  `,
  styles: `
    :host {
      display: block;
      padding-block: clamp(80px, 12vw, 150px);
      text-align: center;
    }
    .l-lede {
      margin-inline: auto;
    }
    ul {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 18px;
      margin: 48px 0 0;
      padding: 0;
      list-style: none;
    }
    @media (max-width: 900px) {
      ul {
        grid-template-columns: 1fr 1fr;
      }
    }
    @media (max-width: 560px) {
      ul {
        grid-template-columns: 1fr;
      }
    }
    // Real regulatory signs are white or yellow in any light, so these don't follow the scheme.
    li {
      --face: #f7f7f2;
      padding: 22px 20px 20px;
      border-radius: 10px;
      background: var(--face);
      color: #151716;
      box-shadow:
        inset 0 0 0 3px var(--face),
        inset 0 0 0 6px #151716,
        0 4px 0 rgb(0 0 0 / 20%);
    }
    li.warn {
      --face: var(--warn);
    }
    h3 {
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 3px solid #151716;
      font: 900 22px/1 var(--font);
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }
    p {
      font-size: 15px;
      line-height: 1.45;
    }
    @keyframes drop {
      0% {
        opacity: 0;
        transform: translateY(-14px) scale(0.9);
      }
      70% {
        opacity: 1;
        transform: translateY(2px);
      }
    }
    @media (prefers-reduced-motion: no-preference) {
      li {
        opacity: 0;
      }
      :host(.seen) li {
        opacity: 1;
        animation: drop 0.6s cubic-bezier(0.2, 0.8, 0.25, 1) both;
        animation-delay: calc(0.2s + var(--i) * 120ms);
      }
    }
  `,
})
export class LandingPrivate {
  protected readonly rules = [
    {
      title: 'Only you',
      body: 'Your map and notes belong to your account. There’s nothing to share and nobody to follow.',
    },
    { title: 'No ads', body: 'No ads, no analytics, nothing sold or shared for marketing.' },
    {
      title: 'Voice stays',
      body: 'Speech becomes text on your iPhone. Curbside doesn’t keep the text after it’s sorted.',
      warn: true,
    },
    {
      title: 'One tap out',
      body: 'Export everything as a file, or delete your account and it’s all gone.',
    },
  ];
}
