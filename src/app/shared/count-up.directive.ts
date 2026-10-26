import {
  DestroyRef,
  Directive,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type CountUpFormat = 'number' | 'brl' | 'compact-brl';
export type CountUpEasing = 'inOutExpo' | 'outExpo' | 'inExpo';

/**
 * Contador numérico com curva exponencial.
 *
 * - Começa em 0 e sobe até o valor quando o elemento entra na tela.
 * - Quando o valor muda depois (ex.: simulador), anima do valor atual até o novo.
 * - No servidor (SSR) escreve o valor final, então o HTML indexado já traz o número certo.
 * - Respeita `prefers-reduced-motion`: troca o número sem animar.
 *
 * Uso: <span [appCountUp]="1284" [decimals]="0" suffix=" ms"></span>
 */
@Directive({
  selector: '[appCountUp]',
  host: { class: 'count-up' },
})
export class CountUpDirective {
  readonly value = input.required<number>({ alias: 'appCountUp' });
  readonly decimals = input(0);
  readonly prefix = input('');
  readonly suffix = input('');
  readonly format = input<CountUpFormat>('number');
  readonly duration = input(1800);
  readonly easing = input<CountUpEasing>('inOutExpo');
  /** Atraso (ms) antes da primeira contagem, para orquestrar vários contadores. */
  readonly delay = input(0);

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private current = 0;
  private started = false;
  private frame = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private observer?: IntersectionObserver;

  constructor() {
    effect(() => {
      const target = this.value();
      // registra as demais entradas como dependências para reformatar se mudarem
      this.decimals();
      this.prefix();
      this.suffix();
      this.format();

      untracked(() => {
        if (!this.isBrowser) {
          this.write(target);
          return;
        }
        if (!this.started) {
          this.write(0);
          return;
        }
        this.animateTo(target);
      });
    });

    afterNextRender(() => {
      const start = () => {
        if (this.started) return;
        this.started = true;
        this.timer = setTimeout(() => this.animateTo(this.value()), this.delay());
      };

      if (typeof IntersectionObserver === 'undefined') {
        start();
        return;
      }
      this.observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            start();
            this.observer?.disconnect();
          }
        },
        { threshold: 0.35 },
      );
      this.observer.observe(this.el.nativeElement);
    });

    inject(DestroyRef).onDestroy(() => {
      if (!this.isBrowser) return;
      cancelAnimationFrame(this.frame);
      clearTimeout(this.timer);
      this.observer?.disconnect();
    });
  }

  private animateTo(target: number): void {
    cancelAnimationFrame(this.frame);
    const from = this.current;
    if (from === target) {
      this.write(target);
      return;
    }

    const reduce =
      typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      this.write(target);
      return;
    }

    // Mudanças pequenas (simulador) usam uma duração menor para responder rápido ao clique.
    const dur = this.started && from !== 0 ? Math.min(this.duration(), 900) : this.duration();
    const ease = EASINGS[this.easing()];
    const t0 = performance.now();
    const host = this.el.nativeElement;
    host.classList.add('is-counting');

    const tick = (now: number) => {
      const k = Math.min((now - t0) / dur, 1);
      this.write(from + (target - from) * ease(k));
      if (k < 1) {
        this.frame = requestAnimationFrame(tick);
      } else {
        this.write(target);
        host.classList.remove('is-counting');
      }
    };
    this.frame = requestAnimationFrame(tick);
  }

  private write(n: number): void {
    this.current = n;
    this.el.nativeElement.textContent = this.prefix() + this.formatValue(n) + this.suffix();
  }

  private formatValue(n: number): string {
    const d = this.decimals();
    switch (this.format()) {
      case 'brl':
        return BRL.format(Math.round(n));
      case 'compact-brl': {
        if (Math.abs(n) >= 1_000_000) {
          return (
            'R$ ' +
            (n / 1_000_000).toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }) +
            ' mi'
          );
        }
        if (Math.abs(n) >= 1_000) {
          return (
            'R$ ' +
            (n / 1_000).toLocaleString('pt-BR', {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            }) +
            ' mil'
          );
        }
        return BRL.format(Math.round(n));
      }
      default:
        return n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
    }
  }
}

const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

/** Curvas exponenciais: o valor cresce em ritmo geométrico, não linear. */
const EASINGS: Record<CountUpEasing, (t: number) => number> = {
  inExpo: (t) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10)),
  outExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inOutExpo: (t) =>
    t === 0
      ? 0
      : t === 1
        ? 1
        : t < 0.5
          ? Math.pow(2, 20 * t - 10) / 2
          : (2 - Math.pow(2, -20 * t + 10)) / 2,
};
