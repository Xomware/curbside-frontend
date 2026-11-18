import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * A house-number plaque fused to a green street-name blade. No name is a house nobody has added yet: a dashed,
 * unpainted blade reading "+ ADD". Styles are global (`.plaque` in styles.scss) because map annotations build the
 * same markup outside Angular.
 */
@Component({
  selector: 'xom-plaque',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="plaque" [class.plaque--empty]="!name()">
      @if (number(); as n) {
        <!-- &ngsp; survives whitespace stripping, so the link reads "11 Pumpernickel", not "11Pumpernickel". -->
        <span class="plaque__number">{{ n }}</span>&ngsp;
      }
      <span class="plaque__name">{{ name() ?? '+ Add' }}</span>
    </span>
  `,
})
export class Plaque {
  readonly number = input<string | null>(null);
  readonly name = input<string | null>(null);
}

/** The same plaque as a bare element, for MapKit annotations. Text only, never HTML: labels are user data. */
export function plaqueElement(
  tag: 'button' | 'span',
  number: string | null,
  name: string | null,
): HTMLElement {
  const element = document.createElement(tag);
  if (element instanceof HTMLButtonElement) element.type = 'button';
  element.className = name ? 'plaque plaque--pin' : 'plaque plaque--pin plaque--empty';
  if (number) {
    const tab = element.appendChild(document.createElement('span'));
    tab.className = 'plaque__number';
    tab.textContent = number;
    element.append(' ');
  }
  const blade = element.appendChild(document.createElement('span'));
  blade.className = 'plaque__name';
  blade.textContent = name ?? '+ Add';
  return element;
}
