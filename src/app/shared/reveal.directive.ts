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

/**
 * Revela o elemento quando ele entra na tela (desfoque + subida suave).
 * O estado inicial só é aplicado no navegador, então o SSR e quem tem JS
 * desligado veem o conteúdo normalmente.
 *
 * Uso: <div appReveal [revealDelay]="120"></div>
 */
@Directive({ selector: '[appReveal]' })
export class RevealDirective {
  readonly revealDelay = input(0);

  constructor() {
    const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
    let observer: IntersectionObserver | undefined;

    afterNextRender(() => {
      if (!isBrowser || typeof IntersectionObserver === 'undefined') return;
      const rect = el.getBoundingClientRect();
      // Já visível no primeiro quadro: entra com a sequência de carregamento.
      el.style.setProperty('--reveal-delay', `${this.revealDelay()}ms`);
      el.classList.add('reveal');

      // Depois que a entrada termina, a classe sai e o elemento volta às
      // próprias transições (hover dos cards etc.).
      const settle = () => {
        timer = setTimeout(() => el.classList.remove('reveal', 'is-in'), 1000 + this.revealDelay());
      };
      const show = () => {
        el.classList.add('is-in');
        settle();
      };

      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              show();
              observer?.unobserve(el);
            }
          }
        },
        { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
      );
      if (rect.top < innerHeight) {
        requestAnimationFrame(() => requestAnimationFrame(show));
      } else {
        observer.observe(el);
      }
    });

    let timer: ReturnType<typeof setTimeout> | undefined;
    inject(DestroyRef).onDestroy(() => {
      observer?.disconnect();
      clearTimeout(timer);
    });
  }
}
