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
import { prefersReducedMotion, whenVisible } from './motion';

export type CountUpFormat = 'number' | 'brl' | 'compact-brl';
export type CountUpEasing = 'inOutExpo' | 'outExpo' | 'inExpo';

// Faz o número subir do 0 até o valor final, começando devagar e acelerando (curva exponencial).
// Só começa quando o número aparece na tela. Se o valor mudar depois (como no simulador),
// ele anima do número atual até o novo em vez de trocar de uma vez.
// No HTML gerado pelo servidor o número já vem no valor final, então o Google lê o valor certo.
//
// Exemplos de uso:
// <span [appCountUp]="1284"></span>                               mostra 1.284
// <span [appCountUp]="99.8" [decimals]="1" suffix="%"></span>     mostra 99,8%
// <span [appCountUp]="1500" format="brl"></span>                  mostra R$ 1.500
// <span [appCountUp]="2412800" format="compact-brl"></span>       mostra R$ 2,41 mi
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
  // Quanto tempo a primeira contagem leva (em milissegundos).
  readonly duration = input(1800);
  readonly easing = input<CountUpEasing>('inOutExpo');
  // Espera antes de começar a contar. Serve para vários números subirem um depois do outro.
  readonly delay = input(0);

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private current = 0;
  private lastText = '';
  private started = false;
  private frame = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private stopWatching: () => void = () => {};

  constructor() {
    // Roda sempre que o valor muda.
    effect(() => {
      const target = this.value();
      this.decimals();
      this.prefix();
      this.suffix();
      this.format();

      untracked(() => {
        if (!this.isBrowser) {
          this.write(target);
        } else if (!this.started) {
          // Ainda não apareceu na tela: fica no 0 esperando.
          this.write(0);
        } else {
          this.animateTo(target);
        }
      });
    });

    // Começa a contar quando o número estiver pelo menos 35% visível.
    afterNextRender(() => {
      this.stopWatching = whenVisible(
        this.el.nativeElement,
        () => {
          this.started = true;
          this.timer = setTimeout(() => this.animateTo(this.value()), this.delay());
        },
        { threshold: 0.35 },
      );
    });

    inject(DestroyRef).onDestroy(() => {
      if (!this.isBrowser) return;
      cancelAnimationFrame(this.frame);
      clearTimeout(this.timer);
      this.stopWatching();
    });
  }

  private animateTo(target: number): void {
    cancelAnimationFrame(this.frame);
    const from = this.current;
    if (from === target || prefersReducedMotion()) {
      this.write(target);
      return;
    }

    // Depois da primeira contagem (ex.: clique no simulador) a animação é mais curta, para responder rápido.
    const dur = from !== 0 ? Math.min(this.duration(), 900) : this.duration();
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
    const text = this.prefix() + this.formatValue(n) + this.suffix();
    // Otimização: só atualiza a tela quando o texto realmente muda (no começo e no fim da curva ele se repete muito).
    if (text === this.lastText) return;
    this.lastText = text;
    this.el.nativeElement.textContent = text;
  }

  private formatValue(n: number): string {
    switch (this.format()) {
      case 'brl':
        return BRL.format(Math.round(n));
      case 'compact-brl':
        if (Math.abs(n) >= 1_000_000) return `R$ ${decimal(2).format(n / 1_000_000)} mi`;
        if (Math.abs(n) >= 1_000) return `R$ ${decimal(1).format(n / 1_000)} mil`;
        return BRL.format(Math.round(n));
      default:
        return decimal(this.decimals()).format(n);
    }
  }
}

// Otimização: os formatadores de número são criados uma vez só e reaproveitados.
// Antes eram criados de novo a cada quadro da animação (cerca de 60 vezes por segundo).
const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

const decimals = new Map<number, Intl.NumberFormat>();
function decimal(d: number): Intl.NumberFormat {
  let f = decimals.get(d);
  if (!f) {
    f = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
    decimals.set(d, f);
  }
  return f;
}

// Curvas de velocidade da contagem.
const EASINGS: Record<CountUpEasing, (t: number) => number> = {
  // Começa parado e dispara no fim.
  inExpo: (t) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10)),
  // Dispara no começo e freia no fim.
  outExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  // Devagar, rápido e devagar de novo (padrão).
  inOutExpo: (t) =>
    t === 0
      ? 0
      : t === 1
        ? 1
        : t < 0.5
          ? Math.pow(2, 20 * t - 10) / 2
          : (2 - Math.pow(2, -20 * t + 10)) / 2,
};
