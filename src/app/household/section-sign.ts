import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The road-sign pictogram fronting each card section: white panel for adults, school-zone pentagon for kids,
 * warning diamond for pets, blue information sign for notes. Paths from mockups/curbside.html.
 */
@Component({
  selector: 'xom-section-sign',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  template: `
    <svg width="38" height="38" viewBox="0 0 38 38">
      @switch (kind()) {
        @case ('adults') {
          <rect x="1.5" y="1.5" width="35" height="35" rx="5" class="panel" />
          <circle cx="19" cy="10.5" r="3.6" class="ink" />
          <path d="M13 17h12l-1.5 8h-2l-.8 8h-3.4l-.8-8h-2z" class="ink" />
        }
        @case ('kids') {
          <path d="M19 1.5L36.5 15v21.5h-35V15z" class="school" />
          <circle cx="14" cy="17" r="2.6" class="ink" />
          <circle cx="24.5" cy="19.5" r="2.2" class="ink" />
          <path
            d="M10.5 21.5h7l-1 6h-1.4l-.6 5h-2.2l-.6-5h-1.2zM21.5 23.5h6l-.9 5h-1.2l-.5 4h-1.8l-.5-4h-1.1z"
            class="ink"
          />
        }
        @case ('pets') {
          <path d="M19 1.5L36.5 19 19 36.5 1.5 19z" class="warn" />
          <path
            d="M8.5 19.5c1.5-.7 3-.8 4.5-.8h8.5l1.6-3c.8-1.4 2.2-1.8 3.6-1.2l2.2 1.4-.8 1.5-1.4.2-.7 3.4-.8 1.8v4.6h-1.6l-.5-3.4h-8.4l-1 3.4h-1.6l.3-4.2-1.4-1.4c-1.3.3-2 .1-3.4-.9z"
            class="ink"
          />
        }
        @case ('notes') {
          <rect x="1.5" y="1.5" width="35" height="35" rx="5" class="info" />
          <path d="M10 12h18M10 18h18M10 24h11" class="lines" />
        }
      }
    </svg>
  `,
  styles: `
    :host {
      display: block;
      flex: none;
    }
    svg {
      display: block;
    }
    .panel,
    .school,
    .warn {
      stroke: var(--sign-ink);
      stroke-width: 2;
      stroke-linejoin: round;
    }
    .panel {
      fill: var(--sign-white);
    }
    .school {
      fill: var(--school);
    }
    .warn {
      fill: var(--warn);
    }
    .ink {
      fill: var(--sign-ink);
    }
    .info {
      fill: var(--blue);
      stroke: var(--sign-white);
      stroke-width: 2;
    }
    .lines {
      stroke: var(--sign-white);
      stroke-width: 2.6;
    }
  `,
})
export class SectionSign {
  readonly kind = input.required<'adults' | 'kids' | 'pets' | 'notes'>();
}
