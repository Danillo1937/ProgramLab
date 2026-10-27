import {
  DestroyRef,
  Directive,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  inject,
  input,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { whenVisible } from './motion';

// Faz o bloco aparecer subindo e saindo do desfoque quando ele chega na tela.
// O bloco só fica escondido no navegador; no HTML do servidor ele já aparece normal.
// O visual da animação está no styles.css (classes .reveal e .is-in).
//
// Exemplos de uso:
// <div appReveal></div>
// <div appReveal [revealDelay]="120"></div>   entra 120 ms depois (bom para cards em sequência)
@Directive({ selector: '[appReveal]' })
export class RevealDirective {
  readonly revealDelay = input(0);

  constructor() {
    const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
    let stopWatching: () => void = () => {};
    let timer: ReturnType<typeof setTimeout> | undefined;

    afterNextRender(() => {
      if (!isBrowser) return;
      const delay = this.revealDelay();
      el.style.setProperty('--reveal-delay', `${delay}ms`);
      el.classList.add('reveal');

      const show = () => {
        el.classList.add('is-in');
        // Depois de entrar, remove as classes para não atrapalhar o efeito de passar o mouse nos cards.
        timer = setTimeout(() => el.classList.remove('reveal', 'is-in'), 1000 + delay);
      };

      if (el.getBoundingClientRect().top < innerHeight) {
        // Se já está na tela quando a página abre, espera um instante para a animação de entrada aparecer.
        requestAnimationFrame(() => requestAnimationFrame(show));
      } else {
        stopWatching = whenVisible(el, show, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
      }
    });

    inject(DestroyRef).onDestroy(() => {
      stopWatching();
      clearTimeout(timer);
    });
  }
}
