import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Meta } from '@angular/platform-browser';
import {
  ActivatedRoute,
  ActivatedRouteSnapshot,
  NavigationEnd,
  Router
} from '@angular/router';
import { filter, map, startWith } from 'rxjs/operators';

/** Formato esperado em `data` de cada rota (ver app.routes.ts). */
export interface RouteSeoData {
  description?: string;
}

const SITE_NAME = 'ProgramLab';

// TODO: troque pelo domínio real de produção (sem barra no final).
const SITE_URL = 'https://www.programlab.com.br';

// Fallback de segurança (até 160 caracteres) para rotas sem `data.description`.
const DEFAULT_DESCRIPTION =
  'ProgramLab: ecossistemas digitais sob medida, websites de alto impacto, automações inteligentes de fluxos e análises de BI orientadas a dados.';

/**
 * Serviço global de SEO.
 *
 * Observa a navegação e, a cada rota concluída, atualiza:
 *  - meta description (com fallback);
 *  - Open Graph / Twitter Card (preview no WhatsApp, LinkedIn, Slack etc.);
 *  - link canonical (evita conteúdo duplicado, ex.: "/" vs "/home").
 *
 * O <title> NÃO é tratado aqui: o Angular já o define a partir de `title` na rota.
 * Usa apenas Meta/DOCUMENT, portanto funciona em SSR.
 */
@Injectable({
  providedIn: 'root'
})
export class SeoService {
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        // Em SSR a navegação inicial pode terminar ANTES deste serviço ser criado.
        // O startWith garante que a rota atual seja processada imediatamente.
        startWith(null),
        map(() => this.getDeepestSnapshot()),
        // Cancela a assinatura automaticamente quando o injetor for destruído.
        takeUntilDestroyed()
      )
      .subscribe((snapshot) => this.updateSeo(snapshot));
  }

  /** Desce até a rota filha mais profunda (a página realmente ativa). */
  private getDeepestSnapshot(): ActivatedRouteSnapshot {
    let route = this.activatedRoute.snapshot;
    while (route.firstChild) {
      route = route.firstChild;
    }
    return route;
  }

  private updateSeo(snapshot: ActivatedRouteSnapshot): void {
    const data = snapshot.data as RouteSeoData;
    const description = data.description || DEFAULT_DESCRIPTION;
    const title = snapshot.title || SITE_NAME;
    const url = this.buildCanonicalUrl();

    // Meta description (updateTag evita duplicar a tag entre navegações)
    this.meta.updateTag({ name: 'description', content: description });

    // Open Graph
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:site_name', content: SITE_NAME });
    this.meta.updateTag({ property: 'og:locale', content: 'pt_BR' });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: url });

    // Twitter Card (sem imagem por enquanto, por isso "summary")
    this.meta.updateTag({ name: 'twitter:card', content: 'summary' });
    this.meta.updateTag({ name: 'twitter:title', content: title });
    this.meta.updateTag({ name: 'twitter:description', content: description });

    this.setCanonical(url);
  }

  /** URL absoluta da página atual, sem query string nem fragmento. */
  private buildCanonicalUrl(): string {
    const path = this.router.url.split(/[?#]/)[0];
    return path === '/' ? SITE_URL : `${SITE_URL}${path}`;
  }

  private setCanonical(url: string): void {
    let link = this.document.head.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]'
    );

    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }

    link.setAttribute('href', url);
  }
}