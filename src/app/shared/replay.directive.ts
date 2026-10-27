import {
  Directive,
  ElementRef,
  PLATFORM_ID,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

// Reinicia uma animação do CSS toda vez que o valor passado muda, sem recriar o elemento.
// Usado no simulador (o brilho que passa no card a cada clique) e no gráfico do exemplo de BI.
// A animação precisa estar ligada à classe .replay no CSS.
//
// Exemplo de uso:
// <span class="brilho" [appReplay]="contador()"></span>
// .brilho.replay { animation: brilho 1s; }
@Directive({ selector: '[appReplay]' })
export class ReplayDirective {
  readonly key = input<unknown>(undefined, { alias: 'appReplay' });
  // Quando true, a animação também roda na primeira vez que o elemento aparece.
  readonly replayInitial = input(false);

  constructor() {
    const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
    let first = true;

    effect(() => {
      this.key();
      untracked(() => {
        // No servidor não existe animação, então não faz nada.
        if (!isBrowser) return;
        if (first) {
          first = false;
          if (!this.replayInitial()) return;
        }
        // Tira e coloca a classe de novo; a leitura do tamanho no meio obriga o navegador a reiniciar a animação.
        el.classList.remove('replay');
        void el.offsetWidth;
        el.classList.add('replay');
      });
    });
  }
}
