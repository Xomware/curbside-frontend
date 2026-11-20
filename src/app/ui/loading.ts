import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Full-screen wait: the street sign sways over a passing road. Same markup as the pre-boot splash in index.html. */
@Component({
  selector: 'xom-loading',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="loading" role="status">
      <img class="loading__pole" src="pole.webp" width="668" height="830" alt="" />
      <div class="loading__road" aria-hidden="true"></div>
      <p class="loading__label">{{ label() }}</p>
    </div>
  `,
})
export class Loading {
  readonly label = input('Loading…');
}
