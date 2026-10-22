import { Routes } from '@angular/router';
import type { RouteSeoData } from './services/seo.service.ts';


export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  {
    path: 'home',
    title: 'ProgramLab | Desenvolvimento Web, Automação RPA e BI',
    loadComponent: () => import('./pages/home/home').then((m) => m.HomeComponent),
    data: {
      description:
        'Transformamos processos em código de alta performance. Desenvolvemos ecossistemas web sob medida, automações RPA complexas e dashboards analíticos de BI.'
    } satisfies RouteSeoData
  },
  {
    path: 'metodologia',
    title: 'Nossa Metodologia | Soluções Corporativas - ProgramLab',
    loadComponent: () =>
      import('./pages/methodology/methodology').then((m) => m.MethodologyComponent),
    data: {
      description:
        'Entenda nosso fluxo de engenharia de dados, desenvolvimento de softwares e SPAs em Angular estáveis, escaláveis e focados na inteligência do seu negócio.'
    } satisfies RouteSeoData
  },
  {
    path: 'contato',
    title: 'Solicitar Orçamento | Fale Conosco - ProgramLab',
    loadComponent: () =>
      import('./pages/contact/contact').then((m) => m.ContactComponent),
    data: {
      description:
        'Projete seu escopo conosco. Entre em contato para obter uma estimativa de prazo e investimento para automações inteligentes, sistemas e análise de dados.'
    } satisfies RouteSeoData
  },
  // Fallback: URLs inexistentes voltam para a home.
  { path: '**', redirectTo: 'home' }
];