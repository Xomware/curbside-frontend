import { ChangeDetectionStrategy, Component } from '@angular/core';

import { Reveal } from './reveal';
import { SignInButtons } from './sign-in-buttons';

/** Night on the street: the wordmark, the tagline, and the sign-in buttons again. */
@Component({
  selector: 'xom-landing-closer',
  imports: [SignInButtons],
  hostDirectives: [Reveal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="inner l-wrap">
      <img src="curbside-sign.webp" width="960" height="210" alt="Curbside" data-in />
      <p class="tag" data-in style="--i: 1">Your street. Your people.</p>
      <p class="sub" data-in style="--i: 2">
        On iPhone and the web. Sign in and put your block on the map.
      </p>
      <xom-sign-in-buttons data-in style="--i: 3" />
    </div>
    <div class="road" aria-hidden="true"></div>
  `,
  styles: `
    // Always night: the asphalt band reads the same in both schemes.
    :host {
      position: relative;
      display: block;
      padding-top: clamp(90px, 13vw, 160px);
      overflow: hidden;
      background: #161918;
      color: #eceee8;
    }
    :host::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(50% 60% at 50% 20%, rgb(255 214 140 / 14%), transparent 70%);
      pointer-events: none;
    }
    .inner {
      position: relative;
      display: grid;
      justify-items: center;
      gap: 22px;
      text-align: center;
    }
    img {
      display: block;
      width: min(560px, 100%);
      height: auto;
    }
    .tag {
      color: #f2f3ea;
      font: italic 900 clamp(24px, 3.4vw, 34px)/1.1 var(--font);
    }
    .sub {
      max-width: 36ch;
      color: #a5aca7;
    }
    // ProviderButton follows the page scheme; this band is dark in both, so pin its dark look.
    :host ::ng-deep button.provider {
      --fill: #131314;
      --text: #e3e3e3;
      --stroke: #8e918f;
    }
    :host ::ng-deep button.provider--apple {
      --fill: #fbfbf8;
      --text: #0b0b0b;
      --stroke: #fbfbf8;
    }
    .road {
      position: relative;
      height: 90px;
      margin-top: 90px;
      border-top: 9px solid #4a4d4b;
      background: #2a2d2c;
      overflow: hidden;
    }
    .road::before {
      content: '';
      position: absolute;
      top: 40px;
      left: 0;
      width: 200%;
      height: 4px;
      background: repeating-linear-gradient(90deg, #efc232 0 46px, transparent 46px 92px);
      animation: drive 3.5s linear infinite;
    }
    @keyframes drive {
      to {
        transform: translateX(-92px);
      }
    }
  `,
})
export class LandingCloser {}
