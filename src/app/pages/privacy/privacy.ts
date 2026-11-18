import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'xom-privacy',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="privacy">
      <h1 class="sign">Privacy</h1>
      <h2>What Curbside stores</h2>
      <p>
        Your display name; the places you map; and the households, people, pets and notes you add.
        Each sign-in you link is stored as an opaque ID. We don't receive your email address.
      </p>
      <h2>Who can read it</h2>
      <p>
        You. Curbside's server reads your data to show it to you, to export it and to parse
        captures. The operator can technically read the database and does not, except to fix a
        problem you report. Data is encrypted at rest with a key whose every use is logged.
      </p>
      <h2>Capture</h2>
      <p>
        Speech is turned into text on your device. When you ask Curbside to read it, the text and
        the names of up to nine nearby households are sent to Anthropic's API to propose changes.
        Curbside doesn't store the text. Anthropic may keep API inputs for a limited time for safety
        review and does not train on them.
      </p>
      <h2>Maps</h2>
      <p>
        Building outlines come from OpenStreetMap via the Overpass API, which sees your place's
        coordinates. Apple Maps draws the map and looks up addresses.
      </p>
      <h2>No tracking</h2>
      <p>No ads, no analytics, no data sold or shared for marketing.</p>
      <h2>Your controls</h2>
      <p>
        Settings → Export downloads everything as JSON. Settings → Delete account removes it all,
        including your sign-ins, and revokes Sign in with Apple.
      </p>
    </main>
  `,
  styles: `
    .privacy {
      max-width: 40rem;
      margin: 0 auto;
      padding: var(--space-5) var(--space-3);
      color: var(--ink);
    }
    h2 {
      margin-top: var(--space-4);
      font-size: 1.1rem;
    }
    p {
      color: var(--ink2);
      line-height: 1.5;
    }
  `,
})
export class PrivacyPage {}
