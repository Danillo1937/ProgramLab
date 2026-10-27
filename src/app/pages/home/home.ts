import {
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CountUpDirective } from '../../shared/count-up.directive';
import { RevealDirective } from '../../shared/reveal.directive';
import { ReplayDirective } from '../../shared/replay.directive';
import { prefersReducedMotion } from '../../shared/motion';
import { ServiceShowcaseComponent } from '../../components/service-showcase/service-showcase';
import type { ShowcaseKind } from '../../components/service-showcase/service-showcase';

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

// Como o prazo total do simulador é dividido entre as 4 etapas da metodologia.
// Os valores somam 1 (100%). Para mudar o peso de uma etapa, é só ajustar aqui.
const PHASES = [
  { id: 'design', label: 'UI/UX', share: 0.18 },
  { id: 'arch', label: 'Arquitetura', share: 0.14 },
  { id: 'dev', label: 'Desenvolvimento', share: 0.53 },
  { id: 'deploy', label: 'Deploy & QA', share: 0.15 },
] as const;

// Velocidade da digitação do terminal no topo da página.
const TYPE_SPEED_MS = 26; // tempo entre uma letra e outra
const LINE_PAUSE_MS = 260; // pausa ao terminar cada linha

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
  // O CSS da home foi dividido em dois arquivos por causa do limite de tamanho por arquivo do projeto.
  // A ordem importa: o home.css vem por último porque tem as regras de celular.
  styleUrls: ['./home-simulator.css', './home.css'],
})
export class HomeComponent {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly mockup = viewChild<ElementRef<HTMLElement>>('mockup');

  // Terminal e métricas do topo da página.
  protected readonly consoleLines: ConsoleLine[] = [
    { text: '> initializing programlab core...', tone: 'cyan' },
    { text: '> mapping systems & workflows...', tone: 'purple' },
    { text: '> connection status: SECURE [100%]', tone: 'green' },
  ];
  // Quantas letras de cada linha já apareceram. No servidor já vem tudo escrito.
  protected readonly typed = signal(this.consoleLines.map((l) => l.text.length));
  // Linha que está sendo digitada agora (mostra o cursor piscando). -1 = nenhuma.
  protected readonly typingLine = signal(-1);
  // Vira true quando a digitação termina; aí as métricas começam a subir.
  protected readonly bootDone = signal(!this.isBrowser);

  protected readonly latency = signal(12);
  protected readonly rpaRate = signal(99.8);
  protected readonly pipelines = signal(24);
  protected readonly bars = signal([40, 65, 50, 85, 95]);

  // Simulador "Projete Seu Escopo".
  protected readonly selectedServices = signal<string[]>(['web']);
  protected readonly complexity = signal<string>('medium'); // small, medium, large
  protected readonly urgency = signal<string>('standard'); // standard, fast

  // Preço base de cada serviço. É aqui que se muda o valor mostrado no simulador.
  protected readonly serviceOptions: ServiceOption[] = [
    { id: 'web', name: 'Web Dev & Software', price: 1500, icon: 'fa-code' },
    { id: 'automation', name: 'Automação RPA', price: 500, icon: 'fa-robot' },
    { id: 'bi', name: 'Business Intelligence', price: 300, icon: 'fa-chart-pie' },
  ];

  // Botões de complexidade e prioridade (agora gerados a partir destas listas).
  protected readonly complexityLevels = [
    { id: 'small', label: 'Simples' },
    { id: 'medium', label: 'Intermediário' },
    { id: 'large', label: 'Complexo / Enterprise' },
  ];
  protected readonly urgencyLevels = [
    { id: 'standard', label: 'Padrão' },
    { id: 'fast', label: 'Acelerada (+25%)' },
  ];

  // Posição do botão escolhido; o indicador que desliza usa isso para saber onde parar.
  protected readonly complexityIndex = computed(() =>
    this.complexityLevels.findIndex((c) => c.id === this.complexity()),
  );
  protected readonly urgencyIndex = computed(() =>
    this.urgencyLevels.findIndex((u) => u.id === this.urgency()),
  );

  // Serviços marcados, guardados de um jeito mais rápido de consultar pelo template.
  protected readonly selectedSet = computed(() => new Set(this.selectedServices()));

  // Aumenta a cada clique no simulador; serve para repetir o brilho de "recalculado" no card.
  protected readonly recalcKey = signal(0);

  // Computed Estimate
  // A regra de preço e prazo é a mesma de antes. A diferença é que agora devolve os números
  // puros (sem formatar), para eles poderem ser animados, e também o valor de cada serviço
  // e os dias de cada etapa.
  protected readonly estimate = computed(() => {
    const activeOptions = this.serviceOptions.filter((o) => this.selectedSet().has(o.id));

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

    // Valor de cada serviço separado, para a lista "Composição do Investimento".
    const breakdown = activeOptions.map((opt) => ({
      ...opt,
      value: opt.price * multiplier * urgencyFactor,
    }));
    const price = breakdown.reduce((acc, b) => acc + b.value, 0);

    // Days calculation adjustment per additional service
    const serviceCount = activeOptions.length;
    const days = Math.round(daysBase + (serviceCount - 1) * (daysBase * 0.4));

    // Divide os dias pelas etapas. A última fica com a sobra do arredondamento, para a soma bater.
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

  // Janela "Ver exemplo" dos cards de serviço.
  protected readonly showcase = signal<ShowcaseKind | null>(null);
  // Ponto da tela onde a janela começa a abrir (o botão clicado).
  protected readonly showcaseOrigin = signal<{ x: number; y: number }>({ x: 50, y: 50 });
  private lastTrigger: HTMLElement | null = null;

  constructor() {
    const timers: ReturnType<typeof setTimeout>[] = [];
    let typing: ReturnType<typeof setInterval> | undefined;
    let live: ReturnType<typeof setInterval> | undefined;
    let mockupObserver: IntersectionObserver | undefined;
    let mockupOnScreen = true;

    afterNextRender(() => {
      if (prefersReducedMotion()) {
        this.bootDone.set(true);
        return;
      }

      // 1) Começa com as barras baixas e o terminal vazio.
      const finalBars = this.bars();
      this.bars.set(finalBars.map(() => 4));
      this.typed.set(this.consoleLines.map(() => 0));
      this.bootDone.set(false);

      // 2) Digita as linhas uma letra por vez.
      // Otimização: antes era um temporizador para cada letra (quase 100); agora é um só que avança letra por letra.
      let line = 0;
      let pauseUntil = performance.now() + 350;
      this.typingLine.set(0);
      typing = setInterval(() => {
        if (performance.now() < pauseUntil) return;
        const total = this.consoleLines[line].text.length;
        const next = this.typed()[line] + 1;
        this.typed.update((t) => t.map((v, i) => (i === line ? next : v)));
        if (next < total) return;

        // Terminou a linha: pausa e passa para a próxima.
        line++;
        pauseUntil = performance.now() + LINE_PAUSE_MS;
        if (line < this.consoleLines.length) {
          this.typingLine.set(line);
          return;
        }

        // 3) Terminou tudo: as métricas sobem e as barras crescem.
        clearInterval(typing);
        timers.push(
          setTimeout(() => {
            this.typingLine.set(-1);
            this.bootDone.set(true);
            this.bars.set(finalBars);
            startLive();
          }, LINE_PAUSE_MS),
        );
      }, TYPE_SPEED_MS);

      // 4) Depois disso os números ficam variando um pouco, como se fossem dados ao vivo.
      // Otimização: só atualiza quando o painel está visível e a aba está aberta.
      const mockupEl = this.mockup()?.nativeElement;
      if (mockupEl && typeof IntersectionObserver !== 'undefined') {
        mockupObserver = new IntersectionObserver(([entry]) => {
          mockupOnScreen = entry.isIntersecting;
        });
        mockupObserver.observe(mockupEl);
      }

      const startLive = () => {
        timers.push(
          setTimeout(() => {
            live = setInterval(() => {
              if (!mockupOnScreen || document.hidden) return;
              this.latency.set(10 + Math.round(Math.random() * 5));
              this.rpaRate.set(+(99.5 + Math.random() * 0.45).toFixed(1));
              this.pipelines.update((p) => (Math.random() > 0.6 ? p + 1 : p));
              // As barras andam para a esquerda e entra uma nova no fim.
              this.bars.update((b) => {
                const last = b[b.length - 1];
                const nova = Math.max(
                  30,
                  Math.min(98, last + Math.round((Math.random() - 0.45) * 30)),
                );
                return [...b.slice(1), nova];
              });
            }, 2600);
          }, 2400),
        );
      };
    });

    inject(DestroyRef).onDestroy(() => {
      timers.forEach(clearTimeout);
      clearInterval(typing);
      clearInterval(live);
      mockupObserver?.disconnect();
    });
  }

  // Cliques do simulador. Cada um também aumenta o recalcKey para o card piscar "recalculado".
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

  // Abre a janela "Ver exemplo" a partir do ponto onde o botão foi clicado.
  protected openShowcase(kind: ShowcaseKind, event: MouseEvent): void {
    const trigger = event.currentTarget as HTMLElement;
    this.lastTrigger = trigger;
    const r = trigger.getBoundingClientRect();
    this.showcaseOrigin.set({
      x: ((r.left + r.width / 2) / innerWidth) * 100,
      y: ((r.top + r.height / 2) / innerHeight) * 100,
    });
    this.showcase.set(kind);
  }

  // Fecha a janela e devolve o foco ao botão que abriu (importante para quem navega pelo teclado).
  protected closeShowcase(): void {
    this.showcase.set(null);
    this.lastTrigger?.focus({ preventScroll: true });
  }
}
