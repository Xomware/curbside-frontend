import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** The TALK stop sign: the way into capture. The page reads the map's current pick when it opens. */
@Component({
  selector: 'xom-talk-sign',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="stop" routerLink="/capture" [attr.aria-label]="label()">
      <svg viewBox="0 0 28 28" aria-hidden="true">
        <path d="M7.6 0h12.8L28 7.6v12.8L20.4 28H7.6L0 20.4V7.6z" class="face" />
        <path
          d="M7.6 0h12.8L28 7.6v12.8L20.4 28H7.6L0 20.4V7.6z"
          transform="translate(1.6 1.6) scale(.886)"
          class="rule"
        />
      </svg>
      <span aria-hidden="true">Talk</span>
    </a>
  `,
  styles: `
    .stop {
      position: relative;
      display: grid;
      place-items: center;
      width: 84px;
      height: 84px;
      color: var(--sign-white);
      text-decoration: none;
    }
    .stop:hover .face {
      filter: brightness(1.08);
    }
    .stop:active {
      transform: translateY(2px);
    }
    svg {
      position: absolute;
      inset: 0;
      filter: drop-shadow(0 3px 0 rgb(0 0 0 / 25%));
    }
    .face {
      fill: var(--stop);
    }
    .rule {
      fill: none;
      stroke: var(--sign-white);
      stroke-width: 1;
    }
    span {
      position: relative;
      padding-top: 3px;
      font: 900 18px/1 var(--font);
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
  `,
})
export class TalkSign {
  readonly label = input('Talk: capture by text');
}
