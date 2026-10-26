import {
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CountUpDirective } from '../../shared/count-up.directive';
import { ReplayDirective } from '../../shared/replay.directive';

export type ShowcaseKind = 'web' | 'automation' | 'bi';
type Device = 'desktop' | 'tablet' | 'mobile';
type Period = '30d' | '90d' | '12m';

interface ShowcaseMeta {
  kind: ShowcaseKind;
  tab: string;
  icon: string;
  tone: 'purple' | 'cyan' | 'green';
  title: string;
  client: string;
  summary: string;
  fragment: string;
}

const META: ShowcaseMeta[] = [
  {
    kind: 'web',
    tab: 'Sites & Softwares',
    icon: 'fa-code',
    tone: 'purple',
    title: 'Portal de pedidos B2B',
    client: 'Distribuidora fictícia · Norte Atacado',
    summary:
      'SPA em Angular com SSR, painel de pedidos em tempo real e deploy contínuo. Veja o sistema se montar, troque o dispositivo e acompanhe a esteira de entrega.',
    fragment: 'dev',
  },
  {
    kind: 'automation',
    tab: 'Automações Inteligentes',
    icon: 'fa-robot',
    tone: 'cyan',
    title: 'Robô de conciliação de notas fiscais',
    client: 'Indústria fictícia · Vale Embalagens',
    summary:
      'O robô lê as NF-e que chegam por e-mail, valida as regras fiscais, lança no ERP e avisa a equipe só quando algo precisa de atenção.',
    fragment: 'automacao',
  },
  {
    kind: 'bi',
    tab: 'Business Intelligence',
    icon: 'fa-chart-pie',
    tone: 'green',
    title: 'Painel executivo de vendas',
    client: 'Rede fictícia · Casa Prado Varejo',
    summary:
      'Cinco fontes consolidadas por ETL num único painel. Troque o período e passe o mouse no gráfico para ver cada ponto.',
    fragment: 'bi',
  },
];

// ───────────────────────────── Dados: Sites ─────────────────────────────
const ORDERS = [
  { id: '#48211', client: 'Mercado Bom Preço', value: 'R$ 12.480', status: 'Faturado', tone: 'ok' },
  {
    id: '#48210',
    client: 'Rede Leste Supermercados',
    value: 'R$ 8.920',
    status: 'Em separação',
    tone: 'warn',
  },
  { id: '#48209', client: 'Empório Central', value: 'R$ 3.115', status: 'Faturado', tone: 'ok' },
  {
    id: '#48208',
    client: 'Atacadão Vila Nova',
    value: 'R$ 21.760',
    status: 'Em rota',
    tone: 'info',
  },
  { id: '#48207', client: 'Padaria Trigo Fino', value: 'R$ 1.940', status: 'Faturado', tone: 'ok' },
] as const;

const PIPELINE = [
  { label: 'Lint & tipos', detail: 'eslint · tsc --noEmit' },
  { label: 'Testes', detail: '312 testes · 94% cobertura' },
  { label: 'Build SSR', detail: 'bundle 148 kB gzip' },
  { label: 'Deploy', detail: 'produção · SSL ativo' },
];

const SCORES = [
  { label: 'Performance', value: 98 },
  { label: 'Acessibilidade', value: 100 },
  { label: 'Boas práticas', value: 100 },
  { label: 'SEO', value: 100 },
];

// ───────────────────────────── Dados: Automação ─────────────────────────────
const FLOW_NODES = [
  {
    id: 'mail',
    label: 'Caixa de e-mail',
    sub: 'NF-e em XML',
    icon: 'fa-envelope-open-text',
    x: 70,
    y: 150,
  },
  { id: 'bot', label: 'Robô leitor', sub: 'extrai 42 campos', icon: 'fa-robot', x: 245, y: 150 },
  {
    id: 'rules',
    label: 'Validação fiscal',
    sub: 'CFOP, NCM, impostos',
    icon: 'fa-scale-balanced',
    x: 420,
    y: 150,
  },
  { id: 'erp', label: 'ERP', sub: 'lançamento automático', icon: 'fa-database', x: 595, y: 80 },
  { id: 'alert', label: 'Alerta à equipe', sub: 'só exceções', icon: 'fa-bell', x: 595, y: 220 },
];
const FLOW_EDGES = [
  { id: 'e1', d: 'M110 150 C 160 150, 165 150, 205 150' },
  { id: 'e2', d: 'M285 150 C 335 150, 340 150, 380 150' },
  { id: 'e3', d: 'M460 150 C 510 150, 515 80, 555 80' },
  { id: 'e4', d: 'M460 150 C 510 150, 515 220, 555 220' },
];

const LOG_SCRIPT: { tone: 'muted' | 'cyan' | 'green' | 'amber'; text: string }[] = [
  { tone: 'muted', text: 'inbox.watch() → 3 novos e-mails com anexo .xml' },
  { tone: 'cyan', text: 'NF-e 35261009 lida · Fornecedor Papel Sul · R$ 18.402,90' },
  { tone: 'green', text: 'validação fiscal OK · CFOP 5101 · NCM 4819.10.00' },
  { tone: 'green', text: 'ERP › lançamento #A-77120 criado em 1,8 s' },
  { tone: 'cyan', text: 'NF-e 35261010 lida · Fornecedor Tintas Rio · R$ 6.115,00' },
  { tone: 'amber', text: 'divergência: ICMS destacado 12% ≠ pedido 18%' },
  { tone: 'amber', text: 'alerta enviado ao fiscal@ · nota retida para revisão' },
  { tone: 'cyan', text: 'NF-e 35261011 lida · Fornecedor Cola Max · R$ 2.930,40' },
  { tone: 'green', text: 'validação fiscal OK · CFOP 5102 · NCM 3506.91.10' },
  { tone: 'green', text: 'ERP › lançamento #A-77121 criado em 1,6 s' },
  { tone: 'muted', text: 'ciclo concluído · próxima varredura em 60 s' },
];

// ───────────────────────────── Dados: BI ─────────────────────────────
interface PeriodData {
  labels: string[];
  revenue: number[]; // R$ mil por ponto
  kpis: { revenue: number; ticket: number; margin: number; clients: number };
  deltas: { revenue: number; ticket: number; margin: number; clients: number };
  regions: { name: string; value: number }[];
  channels: { name: string; share: number }[];
}

/** Série determinística (sem Math.random) para o painel ficar igual a cada abertura. */
function series(n: number, base: number, amp: number, trend: number, seed: number): number[] {
  return Array.from({ length: n }, (_, i) => {
    const wave = Math.sin(i * 0.9 + seed) * amp + Math.sin(i * 0.37 + seed * 2) * amp * 0.6;
    return Math.round((base + wave + i * trend) * 10) / 10;
  });
}

const MONTHS = ['Nov', 'Dez', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out'];

const BI_DATA: Record<Period, PeriodData> = {
  '30d': {
    labels: Array.from(
      { length: 30 },
      (_, i) => `${String(((i + 26) % 30) + 1).padStart(2, '0')}/${i < 4 ? '09' : '10'}`,
    ),
    revenue: series(30, 64, 9, 0.55, 1.2),
    kpis: { revenue: 2_412_800, ticket: 386, margin: 31.4, clients: 6248 },
    deltas: { revenue: 12.4, ticket: 3.1, margin: 1.8, clients: 7.6 },
    regions: [
      { name: 'Sudeste', value: 1_086_000 },
      { name: 'Sul', value: 542_000 },
      { name: 'Nordeste', value: 398_000 },
      { name: 'Centro-Oeste', value: 251_000 },
      { name: 'Norte', value: 135_800 },
    ],
    channels: [
      { name: 'E-commerce', share: 41 },
      { name: 'Lojas físicas', share: 29 },
      { name: 'Marketplace', share: 18 },
      { name: 'Representantes', share: 12 },
    ],
  },
  '90d': {
    labels: Array.from({ length: 13 }, (_, i) => `S${i + 31}`),
    revenue: series(13, 520, 46, 9, 2.4),
    kpis: { revenue: 7_204_500, ticket: 379, margin: 30.6, clients: 14_910 },
    deltas: { revenue: 9.8, ticket: 2.2, margin: 0.9, clients: 11.3 },
    regions: [
      { name: 'Sudeste', value: 3_210_000 },
      { name: 'Sul', value: 1_640_000 },
      { name: 'Nordeste', value: 1_225_000 },
      { name: 'Centro-Oeste', value: 742_000 },
      { name: 'Norte', value: 387_500 },
    ],
    channels: [
      { name: 'E-commerce', share: 39 },
      { name: 'Lojas físicas', share: 31 },
      { name: 'Marketplace', share: 17 },
      { name: 'Representantes', share: 13 },
    ],
  },
  '12m': {
    labels: MONTHS,
    revenue: series(12, 2050, 190, 42, 0.4),
    kpis: { revenue: 27_860_000, ticket: 371, margin: 29.8, clients: 41_270 },
    deltas: { revenue: 18.2, ticket: 4.5, margin: 2.6, clients: 22.1 },
    regions: [
      { name: 'Sudeste', value: 12_480_000 },
      { name: 'Sul', value: 6_310_000 },
      { name: 'Nordeste', value: 4_720_000 },
      { name: 'Centro-Oeste', value: 2_890_000 },
      { name: 'Norte', value: 1_460_000 },
    ],
    channels: [
      { name: 'E-commerce', share: 36 },
      { name: 'Lojas físicas', share: 34 },
      { name: 'Marketplace', share: 16 },
      { name: 'Representantes', share: 14 },
    ],
  },
};

/** Paleta categórica validada (OKLCH, daltonismo e contraste) contra a superfície do painel. */
const CHANNEL_COLORS = ['#0891b2', '#8b5cf6', '#d97706', '#db2777'];

const CHART = { h: 260, padL: 56, padR: 16, padT: 16, padB: 32 };

@Component({
  selector: 'app-service-showcase',
  imports: [RouterLink, CountUpDirective, ReplayDirective],
  templateUrl: './service-showcase.html',
  // Ordem importa: a folha principal (com as regras responsivas) vem por último.
  styleUrls: [
    './showcase-web.css',
    './showcase-automation.css',
    './showcase-bi.css',
    './service-showcase.css',
  ],
  host: {
    '(document:keydown)': 'onKeydown($event)',
  },
})
export class ServiceShowcaseComponent {
  readonly kind = input.required<ShowcaseKind>();
  /** Ponto (em % da viewport) de onde o painel "nasce". */
  readonly origin = input<{ x: number; y: number }>({ x: 50, y: 50 });
  readonly kindChange = output<ShowcaseKind>();
  readonly closed = output<void>();

  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly doc = inject(DOCUMENT);
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');
  private readonly closeBtn = viewChild<ElementRef<HTMLButtonElement>>('closeBtn');
  private readonly body = viewChild<ElementRef<HTMLElement>>('body');
  private timers: ReturnType<typeof setTimeout>[] = [];
  private intervals: ReturnType<typeof setInterval>[] = [];

  protected readonly metas = META;
  protected readonly meta = computed(() => META.find((m) => m.kind === this.kind())!);
  protected readonly closing = signal(false);
  /** Incrementa a cada troca de exemplo para reiniciar animações de entrada. */
  protected readonly runId = signal(0);

  // Web
  protected readonly orders = ORDERS;
  protected readonly pipeline = PIPELINE;
  protected readonly scores = SCORES;
  protected readonly device = signal<Device>('desktop');
  protected readonly built = signal(false);
  protected readonly pipelineStep = signal(0);
  protected readonly ringsOn = signal(false);

  // Automação
  protected readonly flowNodes = FLOW_NODES;
  protected readonly flowEdges = FLOW_EDGES;
  protected readonly activeNode = signal(0);
  protected readonly logs = signal<{ id: number; time: string; tone: string; text: string }[]>([]);
  protected readonly processed = signal(1240);
  protected readonly compareOn = signal(false);

  // BI
  protected readonly period = signal<Period>('30d');
  protected readonly periods: { id: Period; label: string }[] = [
    { id: '30d', label: '30 dias' },
    { id: '90d', label: '90 dias' },
    { id: '12m', label: '12 meses' },
  ];
  protected readonly hoverIdx = signal<number | null>(null);
  protected readonly hoverRegion = signal<number | null>(null);
  protected readonly chartsOn = signal(false);
  protected readonly channelColors = CHANNEL_COLORS;
  protected readonly chart = CHART;
  /** Largura real do gráfico em px: o SVG desenha 1:1, então os textos nunca escalam. */
  protected readonly chartW = signal(900);
  private readonly lineWrap = viewChild<ElementRef<HTMLElement>>('lineWrap');
  protected readonly bi = computed(() => BI_DATA[this.period()]);

  protected readonly line = computed(() => {
    const { revenue, labels } = this.bi();
    const w = this.chartW();
    const { lo, hi, step } = niceScale(Math.min(...revenue), Math.max(...revenue));
    const iw = w - CHART.padL - CHART.padR;
    const ih = CHART.h - CHART.padT - CHART.padB;
    const pts = revenue.map((v, i) => ({
      x: CHART.padL + (i / (revenue.length - 1)) * iw,
      y: CHART.padT + ih - ((v - lo) / (hi - lo)) * ih,
      v,
      label: labels[i],
    }));
    const d = smoothPath(pts);
    const baseY = CHART.padT + ih;
    const area = `${d} L ${pts[pts.length - 1].x} ${baseY} L ${pts[0].x} ${baseY} Z`;
    const ticks: { y: number; label: string }[] = [];
    for (let v = lo; v <= hi + step / 2; v += step) {
      ticks.push({
        y: CHART.padT + ih - ((v - lo) / (hi - lo)) * ih,
        label: formatAxis(v, this.period()),
      });
    }
    // rótulos do eixo X espaçados por largura disponível (≈ 1 a cada 90 px)
    const maxLabels = Math.max(3, Math.floor(iw / 90));
    const every = Math.ceil(labels.length / maxLabels);
    const xLabels = pts.filter((_, i) => i % every === 0);
    return { pts, d, area, ticks, xLabels, baseY, w };
  });

  protected readonly hoverPoint = computed(() => {
    const i = this.hoverIdx();
    return i === null ? null : this.line().pts[i];
  });

  protected readonly regionMax = computed(() => Math.max(...this.bi().regions.map((r) => r.value)));
  protected readonly regionTotal = computed(() =>
    this.bi().regions.reduce((a, r) => a + r.value, 0),
  );

  protected readonly donut = computed(() => {
    let acc = 0;
    return this.bi().channels.map((c, i) => {
      const seg = {
        ...c,
        color: CHANNEL_COLORS[i],
        offset: -acc,
        len: Math.max(c.share - 0.8, 0.1),
      };
      acc += c.share;
      return seg;
    });
  });

  constructor() {
    effect(() => {
      const kind = this.kind();
      untracked(() => {
        if (this.isBrowser) this.start(kind);
      });
    });

    // Observa a largura do gráfico de linha quando ele existe (aba BI).
    let ro: ResizeObserver | undefined;
    effect(() => {
      const el = this.lineWrap()?.nativeElement;
      ro?.disconnect();
      if (!el || typeof ResizeObserver === 'undefined') return;
      ro = new ResizeObserver(([entry]) => {
        const w = Math.round(entry.contentRect.width);
        if (w > 0) this.chartW.set(w);
      });
      ro.observe(el);
    });
    inject(DestroyRef).onDestroy(() => ro?.disconnect());

    afterNextRender(() => {
      const body = this.doc.body;
      const prev = body.style.overflow;
      body.style.overflow = 'hidden';
      this.closeBtn()?.nativeElement.focus({ preventScroll: true });
      this.cleanupBody = () => (body.style.overflow = prev);
    });

    inject(DestroyRef).onDestroy(() => {
      this.clearAll();
      this.cleanupBody();
    });
  }

  private cleanupBody: () => void = () => {};

  // ───────────────────────────── Sequências ─────────────────────────────
  private start(kind: ShowcaseKind): void {
    this.clearAll();
    this.runId.update((r) => r + 1);
    this.body()?.nativeElement.scrollTo({ top: 0 });
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const at = (ms: number, fn: () => void) => this.timers.push(setTimeout(fn, reduce ? 0 : ms));
    const every = (ms: number, fn: () => void) => {
      if (!reduce) this.intervals.push(setInterval(fn, ms));
    };

    if (kind === 'web') {
      this.built.set(false);
      this.pipelineStep.set(0);
      this.ringsOn.set(false);
      at(950, () => this.built.set(true));
      at(500, () => this.ringsOn.set(true));
      PIPELINE.forEach((_, i) => at(700 + i * 750, () => this.pipelineStep.set(i + 1)));
    }

    if (kind === 'automation') {
      this.logs.set([]);
      this.activeNode.set(0);
      this.compareOn.set(false);
      this.processed.set(1240);
      at(600, () => this.compareOn.set(true));
      let li = 0;
      const pushLog = () => {
        const entry = LOG_SCRIPT[li % LOG_SCRIPT.length];
        const now = new Date();
        const time = now.toLocaleTimeString('pt-BR', { hour12: false });
        this.logs.update((l) => [...l.slice(-7), { id: li, time, ...entry }]);
        li++;
      };
      pushLog();
      every(950, pushLog);
      every(820, () => this.activeNode.update((n) => (n + 1) % FLOW_NODES.length));
      every(1300, () => this.processed.update((p) => p + 1 + Math.floor(Math.random() * 3)));
      if (reduce) LOG_SCRIPT.slice(1, 8).forEach(pushLog);
    }

    if (kind === 'bi') {
      this.chartsOn.set(false);
      this.hoverIdx.set(null);
      at(80, () => this.chartsOn.set(true));
    }
  }

  private clearAll(): void {
    this.timers.forEach(clearTimeout);
    this.intervals.forEach(clearInterval);
    this.timers = [];
    this.intervals = [];
  }

  // ───────────────────────────── Interações ─────────────────────────────
  protected select(kind: ShowcaseKind): void {
    if (kind !== this.kind()) this.kindChange.emit(kind);
  }

  protected setPeriod(p: Period): void {
    if (p === this.period()) return;
    this.period.set(p);
    this.hoverIdx.set(null);
  }

  protected onChartMove(event: PointerEvent): void {
    const svg = event.currentTarget as SVGSVGElement;
    const r = svg.getBoundingClientRect();
    const x = ((event.clientX - r.left) / r.width) * this.chartW();
    const pts = this.line().pts;
    let best = 0;
    for (let i = 1; i < pts.length; i++) {
      if (Math.abs(pts[i].x - x) < Math.abs(pts[best].x - x)) best = i;
    }
    this.hoverIdx.set(best);
  }

  protected close(): void {
    if (this.closing()) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.closing.set(true);
    setTimeout(() => this.closed.emit(), reduce ? 0 : 280);
  }

  protected onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.close();
      return;
    }
    if (e.key !== 'Tab') return;
    // Mantém o foco dentro do painel enquanto ele está aberto.
    const root = this.panel()?.nativeElement;
    if (!root) return;
    const focusables = Array.from(
      root.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => el.offsetParent !== null);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && this.doc.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && this.doc.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  // ───────────────────────────── Formatação ─────────────────────────────
  protected brl(n: number): string {
    return n.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    });
  }

  protected compactBrl(n: number): string {
    if (n >= 1_000_000)
      return `R$ ${(n / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} mi`;
    return `R$ ${(n / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} mil`;
  }

  protected pointValue(v: number): string {
    return this.period() === '12m'
      ? `R$ ${(v / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} mi`
      : `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mil`;
  }

  protected tooltipLeft(x: number): number {
    return (x / this.chartW()) * 100;
  }
}

/** Escala com passos "redondos" (1, 2, 2,5, 5 × 10ⁿ) que envolve os dados. */
function niceScale(min: number, max: number, ticks = 4): { lo: number; hi: number; step: number } {
  const raw = (max - min) / ticks;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / mag;
  const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
  const lo = Math.max(0, Math.floor((min - step * 0.5) / step) * step);
  const hi = Math.ceil((max + step * 0.25) / step) * step;
  return { lo, hi, step };
}

function formatAxis(v: number, p: Period): string {
  if (p === '12m')
    return v === 0 ? '0' : `${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} mi`;
  return v === 0 ? '0' : `${Math.round(v)} mil`;
}

/** Curva suave (Catmull-Rom → Bézier) que passa por todos os pontos. */
function smoothPath(pts: { x: number; y: number }[]): string {
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}
