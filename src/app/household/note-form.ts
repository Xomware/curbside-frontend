import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { HouseholdModel } from './household-model';

/** Write a note about a household. Saving one also counts as talking to them today. */
@Component({
  selector: 'xom-note-form',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="editor" (submit)="$event.preventDefault(); save()">
      <h2 #heading class="eyebrow" tabindex="-1">New note</h2>
      <div class="field">
        <label for="note-text">What did you learn?</label>
        <textarea id="note-text" [formControl]="text" rows="5" maxlength="2000"></textarea>
      </div>
      @if (failed()) {
        <p class="notice" role="alert">Couldn't save the note. Try again.</p>
      }
      <button class="btn btn--green" type="submit" [disabled]="text.invalid || busy()">
        {{ busy() ? 'Saving…' : 'Save note' }}
      </button>
      <div class="editor__more">
        <button class="btn-text" type="button" [disabled]="busy()" (click)="done.emit('')">
          Cancel
        </button>
      </div>
    </form>
  `,
})
export class NoteForm {
  private readonly model = inject(HouseholdModel);
  readonly done = output<string>();

  protected readonly text = inject(NonNullableFormBuilder).control('', [
    Validators.required,
    Validators.pattern(/\S/),
    Validators.maxLength(2000),
  ]);
  protected readonly busy = signal(false);
  protected readonly failed = signal(false);
  private readonly heading = viewChild.required<ElementRef<HTMLElement>>('heading');

  constructor() {
    afterNextRender(() => this.heading().nativeElement.focus());
  }

  protected async save(): Promise<void> {
    this.busy.set(true);
    const saved = await this.model.addNote(this.text.value.trim());
    this.busy.set(false);
    if (saved) this.done.emit('Note saved.');
    else this.failed.set(true);
  }
}
