import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { Provider } from '../auth/cognito';

/**
 * Each provider in its own brand style. Apple: black in light mode, white in dark, logo and title in one
 * colour, no less prominent than other sign-in buttons. Google: the four-colour G on a neutral fill.
 */
@Component({
  selector: 'button[xomProvider]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { type: 'button', class: 'provider', '[class.provider--apple]': 'apple()' },
  template: `
    @if (apple()) {
      <svg viewBox="0 0 17 20" aria-hidden="true">
        <path
          fill="currentColor"
          d="M14.1 10.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9C3.5 4.8 1.9 5.8 1 7.4c-1.8 3.2-.5 7.9 1.3 10.5.9 1.3 1.9 2.7 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.6 1-1.5 1.4-2.9 1.4-3-.1 0-2.6-1-2.6-4.3zM11.6 3c.7-.9 1.2-2 1.1-3.2-1 0-2.3.7-3 1.6-.7.8-1.3 2-1.1 3.1 1.1.1 2.3-.6 3-1.5z"
        />
      </svg>
    } @else {
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path
          fill="#EA4335"
          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
        />
        <path
          fill="#4285F4"
          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
        />
        <path
          fill="#FBBC05"
          d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
        />
        <path
          fill="#34A853"
          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
        />
      </svg>
    }
    <span>{{ apple() ? 'Continue with Apple' : 'Continue with Google' }}</span>
  `,
  styles: `
    :host {
      --fill: #fdfdfa;
      --text: #1f1f1f;
      --stroke: #747775;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      width: 100%;
      min-height: 48px;
      padding: 0 16px;
      border: 1px solid var(--stroke);
      border-radius: 8px;
      background: var(--fill);
      color: var(--text);
      font:
        600 16px/1 system-ui,
        -apple-system,
        sans-serif;
      cursor: pointer;
    }
    :host(.provider--apple) {
      --fill: #0b0b0b;
      --text: #fbfbf8;
      --stroke: #0b0b0b;
    }
    @media (prefers-color-scheme: dark) {
      :host {
        --fill: #131314;
        --text: #e3e3e3;
        --stroke: #8e918f;
      }
      :host(.provider--apple) {
        --fill: #fbfbf8;
        --text: #0b0b0b;
        --stroke: #fbfbf8;
      }
    }
    :host(:hover:not(:disabled)) {
      filter: brightness(0.92);
    }
    :host(:active:not(:disabled)) {
      transform: translateY(1px);
    }
    :host(:disabled) {
      opacity: 0.45;
      cursor: not-allowed;
    }
    svg {
      width: 18px;
      height: 18px;
      flex: none;
    }
  `,
})
export class ProviderButton {
  readonly xomProvider = input.required<Provider>();
  protected readonly apple = computed(() => this.xomProvider() === 'SignInWithApple');
}
