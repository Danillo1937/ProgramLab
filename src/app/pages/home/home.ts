import {
  Component,
  DestroyRef,
  PLATFORM_ID,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CountUpDirective } from '../../shared/count-up.directive';
import { RevealDirective } from '../../shared/reveal.directive';
import { ReplayDirective } from '../../shared/replay.directive';
import {
  ServiceShowcaseComponent,
  ShowcaseKind,
} from '../../components/service-showcase/service-showcase';

interface ServiceOption {
  id: string;
  name: string;
  price: number;
  icon: string;
}

interface ConsoleLine {
  text: string;
  tone: 'cyan' | 'purple' | 'green';
}

/** Divisão do prazo pelas 4 etapas da metodologia (UI/UX → Arquitetura → Dev → Deploy). */
const PHASES = [
  { id: 'design', label: 'UI/UX', share: 0.18 },
  { id: 'arch', label: 'Arquitetura', share: 0.14 },
  { id: 'dev', label: 'Desenvolvimento', share: 0.53 },
  { id: 'deploy', label: 'Deploy & QA', share: 0.15 },
] as const;

@Component({
  selector: 'app-home',
  imports: [
    RouterLink,
    CountUpDirective,
    RevealDirective,
    ReplayDirective,
    ServiceShowcaseComponent,
  ],
  templateUrl: './home.html',
  // Simulador primeiro; home.css (com as regras responsivas) por último.
  styleUrls: ['./home-simulator.css', './home.css'],
})
export class HomeComponent {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  // ───────────────────────── Hero: terminal + métricas vivas ─────────────────────────
  protected readonly consoleLines: ConsoleLine[] = [
    { text: '> initializing programlab core...', tone: 'cyan' },
    { text: '> mapping systems & workflows...', tone: 'purple' },
    { text: '> connection status: SECURE [100%]', tone: 'green' },
  ];
  /** Quantos caracteres de cada linha já foram digitados. No SSR, tudo visível. */
  protected readonly typed = signal(this.consoleLines.map((l) => l.text.length));
  protected readonly typingLine = signal(-1);
  protected readonly bootDone = signal(!this.isBrowser);

  protected readonly latency = signal(12);
  protected readonly rpaRate = signal(99.8);
  protected readonly pipelines = signal(24);
  protected readonly bars = signal([40, 65, 50, 85, 95]);

  // ───────────────────────── Simulador ─────────────────────────
  protected readonly selectedServices = signal<string[]>(['web']);
  protected readonly complexity = signal<string>('medium'); // small, medium, large
  protected readonly urgency = signal<string>('standard'); // standard, fast

  protected readonly serviceOptions: ServiceOption[] = [
    { id: 'web', name: 'Web Dev & Software', price: 1500, icon: 'fa-code' },
    { id: 'automation', name: 'Automação RPA', price: 500, icon: 'fa-robot' },
    { id: 'bi', name: 'Business Intelligence', price: 300, icon: 'fa-chart-pie' },
  ];

  protected readonly complexityLevels = [
    { id: 'small', label: 'Simples' },
    { id: 'medium', label: 'Intermediário' },
    { id: 'large', label: 'Complexo / Enterprise' },
  ];
  protected readonly urgencyLevels = [
    { id: 'standard', label: 'Padrão' },
    { id: 'fast', label: 'Acelerada (+25%)' },
  ];

  protected readonly complexityIndex = computed(() =>
    this.complexityLevels.findIndex((c) => c.id === this.complexity()),
  );
  protected readonly urgencyIndex = computed(() =>
    this.urgencyLevels.findIndex((u) => u.id === this.urgency()),
  );

  /** Muda a cada interação; usado para reiniciar o feixe de "recalculando". */
  protected readonly recalcKey = signal(0);

  // Computed Estimate (mesma regra de negócio do original, agora com números brutos)
  protected readonly estimate = computed(() => {
    const activeOptions = this.serviceOptions.filter((o) => this.selectedServices().includes(o.id));

    if (activeOptions.length === 0) {
      return { empty: true, price: 0, days: 0, breakdown: [], phases: [] };
    }

    // Complexity Multiplier
    let multiplier = 1;
    let daysBase = 24;

    if (this.complexity() === 'small') {
      multiplier = 0.7;
      daysBase = 14;
    } else if (this.complexity() === 'large') {
      multiplier = 2;
      daysBase = 60;
    }

    // Urgency Modifiers
    const urgencyFactor = this.urgency() === 'fast' ? 1.25 : 1;
    if (this.urgency() === 'fast') {
      daysBase = Math.round(daysBase * 0.6);
    }

    const breakdown = activeOptions.map((opt) => ({
      ...opt,
      value: opt.price * multiplier * urgencyFactor,
    }));
    const price = breakdown.reduce((acc, b) => acc + b.value, 0);

    // Days calculation adjustment per additional service
    const serviceCount = activeOptions.length;
    const days = Math.round(daysBase + (serviceCount - 1) * (daysBase * 0.4));

    // Distribui os dias pelas etapas; a última absorve o arredondamento.
    let used = 0;
    const phases = PHASES.map((p, i) => {
      const d = i === PHASES.length - 1 ? days - used : Math.max(1, Math.round(days * p.share));
      used += d;
      return { ...p, days: d };
    });

    return {
      empty: false,
      price,
      days,
      breakdown: breakdown.map((b) => ({ ...b, pct: (b.value / price) * 100 })),
      phases,
    };
  });

  // ───────────────────────── Exemplos dos serviços ─────────────────────────
  protected readonly showcase = signal<ShowcaseKind | null>(null);
  protected readonly showcaseOrigin = signal<{ x: number; y: number }>({ x: 50, y: 50 });
  private lastTrigger: HTMLElement | null = null;

  constructor() {
    const timers: ReturnType<typeof setTimeout>[] = [];
    let live: ReturnType<typeof setInterval> | undefined;

    afterNextRender(() => {
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce) {
        this.bootDone.set(true);
        return;
      }

      // 1) Sequência de boot: barras zeradas, linhas digitadas uma a uma.
      const finalBars = this.bars();
      this.bars.set(finalBars.map(() => 4));
      this.typed.set(this.consoleLines.map(() => 0));
      this.bootDone.set(false);

      let delay = 350;
      this.consoleLines.forEach((line, li) => {
        timers.push(setTimeout(() => this.typingLine.set(li), delay));
        for (let c = 1; c <= line.text.length; c++) {
          timers.push(
            setTimeout(
              () => {
                this.typed.update((t) => t.map((v, i) => (i === li ? c : v)));
              },
              delay + c * 26,
            ),
          );
        }
        delay += line.text.length * 26 + 260;
      });

      // 2) Depois do boot: métricas sobem e barras crescem.
      timers.push(
        setTimeout(() => {
          this.typingLine.set(-1);
          this.bootDone.set(true);
          this.bars.set(finalBars);
        }, delay),
      );

      // 3) Telemetria "ao vivo": pequenas variações plausíveis a cada ciclo.
      timers.push(
        setTimeout(() => {
          live = setInterval(() => {
            this.latency.set(10 + Math.round(Math.random() * 5));
            this.rpaRate.set(+(99.5 + Math.random() * 0.45).toFixed(1));
            this.pipelines.update((p) => (Math.random() > 0.6 ? p + 1 : p));
            this.bars.update((b) => {
              const next = b.slice(1).map((v) => v);
              const last = b[b.length - 1];
              next.push(Math.max(30, Math.min(98, last + Math.round((Math.random() - 0.45) * 30))));
              return next;
            });
          }, 2600);
        }, delay + 2400),
      );
    });

    inject(DestroyRef).onDestroy(() => {
      timers.forEach(clearTimeout);
      clearInterval(live);
    });
  }

  // ───────────────────────── Ações do simulador ─────────────────────────
  protected toggleService(id: string): void {
    const current = this.selectedServices();
    if (current.includes(id)) {
      this.selectedServices.set(current.filter((item) => item !== id));
    } else {
      this.selectedServices.set([...current, id]);
    }
    this.recalcKey.update((k) => k + 1);
  }

  protected setComplexity(level: string): void {
    if (this.complexity() === level) return;
    this.complexity.set(level);
    this.recalcKey.update((k) => k + 1);
  }

  protected setUrgency(speed: string): void {
    if (this.urgency() === speed) return;
    this.urgency.set(speed);
    this.recalcKey.update((k) => k + 1);
  }

  protected isSelected(id: string): boolean {
    return this.selectedServices().includes(id);
  }

  // ───────────────────────── Ações do modal ─────────────────────────
  protected openShowcase(kind: ShowcaseKind, event: MouseEvent): void {
    const trigger = event.currentTarget as HTMLElement;
    this.lastTrigger = trigger;
    const r = trigger.getBoundingClientRect();
    // origem da animação = ponto do botão, em % da viewport
    this.showcaseOrigin.set({
      x: ((r.left + r.width / 2) / innerWidth) * 100,
      y: ((r.top + r.height / 2) / innerHeight) * 100,
    });
    this.showcase.set(kind);
  }

  protected closeShowcase(): void {
    this.showcase.set(null);
    this.lastTrigger?.focus({ preventScroll: true });
  }
}
