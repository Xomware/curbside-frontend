import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'xom-terms',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="terms">
      <h1 class="sign">Terms</h1>
      <p>
        These terms cover Curbside on the web and on iPhone, made by Xomware. By using Curbside you
        agree to them.
      </p>
      <h2>What Curbside is</h2>
      <p>
        A notebook for remembering who lives on your street. You map a street, add the households
        on it, and can share that street with neighbors you invite.
      </p>
      <h2>Your content</h2>
      <p>
        What you add stays yours. You give Curbside permission to store it and show it to you and to
        the people on streets you share, which is what the app needs to work. Export or delete it any
        time from Settings.
      </p>
      <h2>Be a good neighbor</h2>
      <p>
        Only write down what a neighbor would be comfortable knowing you remember. Don't use
        Curbside to harass, track or expose anyone, don't add information you have no right to, and
        don't try to get at other people's streets or break the service. We can remove content or
        close accounts that do.
      </p>
      <h2>Shared streets</h2>
      <p>
        Everyone on a shared street can see and edit its households and notes. The owner can remove
        people. If the owner deletes their account, the street passes to whoever has been on it
        longest.
      </p>
      <h2>Your account</h2>
      <p>
        You sign in with Apple or Google and are responsible for what happens under your account.
        Deleting it removes your data as described in the <a routerLink="/privacy">privacy policy</a>.
      </p>
      <h2>No warranty</h2>
      <p>
        Curbside is provided as is. It may change, have downtime or stop, and maps, outlines and
        addresses can be wrong. To the extent the law allows, Xomware isn't liable for losses from
        using it.
      </p>
      <h2>Changes</h2>
      <p>
        We may update these terms. If a change matters, the app will say so; using Curbside after
        that means you accept it.
      </p>
    </main>
  `,
  styles: `
    .terms {
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
    a {
      color: inherit;
    }
  `,
})
export class TermsPage {}
