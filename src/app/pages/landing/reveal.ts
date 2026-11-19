import { DestroyRef, Directive, ElementRef, afterNextRender, inject, signal } from '@angular/core';

/** Marks its host `seen` the first time a quarter of it scrolls into view; at once when motion is reduced. */
@Directive({
  selector: '[xomReveal]',
  host: { class: 'l-reveal', '[class.seen]': 'seen()' },
})
export class Reveal {
  readonly seen = signal(false);
  readonly animate = signal(true);

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (
        matchMedia('(prefers-reduced-motion: reduce)').matches ||
        !('IntersectionObserver' in window)
      ) {
        this.animate.set(false);
        this.seen.set(true);
        return;
      }
      const io = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          this.seen.set(true);
          io.disconnect();
        },
        { threshold: 0.25 },
      );
      io.observe(host);
      destroyRef.onDestroy(() => io.disconnect());
    });
  }
}
