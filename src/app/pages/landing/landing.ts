import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { LandingCloser } from './closer';
import { LandingHero } from './hero';

/** What a signed-out visitor sees at `/`: what Curbside is, with sign-in at the top and the bottom. */
@Component({
  selector: 'xom-landing',
  imports: [RouterLink, LandingHero, LandingCloser],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="l-wrap">
      <a class="mark" routerLink="/">CURBSIDE</a>
      <a class="signin" routerLink="/sign-in">Sign in</a>
    </header>
    <main>
      <xom-landing-hero (more)="how.scrollIntoView({ behavior: 'smooth' })" />
      <span #how></span>
      <xom-landing-closer />
    </main>
    <footer>
      <div class="l-wrap">
        <span>Made by Xomware</span>
        <a routerLink="/privacy">Privacy</a>
      </div>
    </footer>
  `,
  styles: `
    header {
      position: absolute;
      inset: 0 0 auto;
      z-index: 5;
      display: flex;
      justify-content: space-between;
      align-items: center;
      min-height: 52px;
      margin-top: max(16px, env(safe-area-inset-top));
    }
    .mark {
      font: 900 14px/1 var(--font);
      letter-spacing: 0.32em;
      text-decoration: none;
    }
    .signin {
      padding: 14px 4px;
      font: 700 15px/1 var(--font);
      text-underline-offset: 4px;
    }
    footer {
      padding-bottom: max(28px, env(safe-area-inset-bottom));
      background: #2a2d2c;
      color: #a5aca7;
      font-size: 14px;
    }
    footer .l-wrap {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 12px;
    }
    footer a {
      padding: 6px 0;
      color: #eceee8;
      text-underline-offset: 3px;
    }
  `,
})
export class LandingPage {}
