// Funções de apoio para as animações do site.

// Verifica se a pessoa pediu "reduzir movimento" nas configurações do sistema.
// Quando sim, as animações são puladas e os valores aparecem direto.
let reduceQuery: MediaQueryList | null = null;

export function prefersReducedMotion(): boolean {
  if (typeof matchMedia === 'undefined') return false;
  reduceQuery ??= matchMedia('(prefers-reduced-motion: reduce)');
  return reduceQuery.matches;
}

// Avisa quando um elemento aparece na tela (uma vez só).
// Antes cada contador e cada bloco criava o próprio "vigia" de rolagem; agora todos
// dividem o mesmo, o que deixa a página mais leve com dezenas de números animados.
type Pool = { io: IntersectionObserver; callbacks: Map<Element, () => void> };
const pools = new Map<string, Pool>();

export function whenVisible(
  el: Element,
  callback: () => void,
  options: IntersectionObserverInit = {},
): () => void {
  // Navegador muito antigo: mostra na hora.
  if (typeof IntersectionObserver === 'undefined') {
    callback();
    return () => {};
  }

  const key = `${options.rootMargin ?? ''}|${options.threshold ?? 0}`;
  let pool = pools.get(key);
  if (!pool) {
    const callbacks = new Map<Element, () => void>();
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const cb = callbacks.get(entry.target);
        callbacks.delete(entry.target);
        io.unobserve(entry.target);
        cb?.();
      }
    }, options);
    pool = { io, callbacks };
    pools.set(key, pool);
  }

  pool.callbacks.set(el, callback);
  pool.io.observe(el);

  // Retorna uma função para parar de vigiar (usada quando o componente sai da tela antes de aparecer).
  const p = pool;
  return () => {
    p.callbacks.delete(el);
    p.io.unobserve(el);
  };
}
