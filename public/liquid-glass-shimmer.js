(() => {
  'use strict';

  /* Build 3 — Shimmer Progress. Only existing progress fills are enhanced. */
  const PROGRESS_FILLS = [
    '.dashboard-progress-track > i',
    '.course-workspace-progress-track > span',
    '.overview-progress-track > span',
    '.health-track > span',
    '.session-progress-track > span',
    '.learning-progress > div > i',
  ].join(',');

  const reducedMotionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const prefersReducedMotion = () => Boolean(reducedMotionQuery?.matches);

  function prepare(fill, index) {
    if (!fill || !(fill instanceof HTMLElement)) return;
    if (prefersReducedMotion()) {
      fill.classList.remove('glass-shimmer-progress');
      fill.style.removeProperty('--shimmer-delay');
      return;
    }
    if (!fill.classList.contains('glass-shimmer-progress')) fill.classList.add('glass-shimmer-progress');
    fill.style.setProperty('--shimmer-delay', `${-((index % 5) * 0.38)}s`);
  }

  function refresh() {
    document.querySelectorAll(PROGRESS_FILLS).forEach((fill, index) => prepare(fill, index));
  }

  function boot() {
    refresh();
    let queued = false;
    const observer = new MutationObserver((mutations) => {
      const relevant = mutations.some((mutation) => [...mutation.addedNodes].some((node) => {
        if (!(node instanceof Element)) return false;
        return node.matches(PROGRESS_FILLS) || Boolean(node.querySelector(PROGRESS_FILLS));
      }));
      if (!relevant || queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; refresh(); });
    });
    observer.observe(document.body, { childList: true, subtree: true });
    reducedMotionQuery?.addEventListener?.('change', refresh);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
