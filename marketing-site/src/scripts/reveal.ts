/**
 * Adds .is-in to [data-reveal] elements as they enter the viewport. One shared IntersectionObserver,
 * no scroll listeners. Content is visible without JS and with reduced motion (CSS only hides it
 * when <html> has .motion-ok, which the head script sets).
 */
export function initReveal(): void {
  const root = document.documentElement;
  if (!root.classList.contains('motion-ok')) return;
  const els = document.querySelectorAll<HTMLElement>('[data-reveal]');
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
  );
  els.forEach((el) => io.observe(el));
}

/** True when the user has not asked for reduced motion. */
export const motionOk = (): boolean => !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
