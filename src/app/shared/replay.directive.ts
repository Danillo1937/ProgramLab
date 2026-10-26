import { Directive, ElementRef, effect, inject, input, untracked } from '@angular/core';

/**
 * Reinicia uma animação CSS sempre que `appReplay` muda de valor,
 * sem recriar o elemento. A animação deve estar presa à classe `.replay`.
 *
 * Uso: <span class="beam" [appReplay]="recalcKey()"></span>
 *      .beam.replay { animation: beam 1s; }
 */
@Directive({ selector: '[appReplay]' })
export class ReplayDirective {
  readonly key = input<unknown>(undefined, { alias: 'appReplay' });
  /** Toca também na primeira renderização. */
  readonly replayInitial = input(false);

  constructor() {
    const el = inject<ElementRef<Element>>(ElementRef).nativeElement;
    let first = true;

    effect(() => {
      this.key();
      untracked(() => {
        if (first) {
          first = false;
          if (!this.replayInitial()) return;
        }
        el.classList.remove('replay');
        // força o navegador a registrar a remoção antes de adicionar de novo
        if (typeof (el as HTMLElement).getBoundingClientRect === 'function') {
          void (el as HTMLElement).getBoundingClientRect();
        }
        el.classList.add('replay');
      });
    });
  }
}
