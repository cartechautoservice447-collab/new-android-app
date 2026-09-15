(() => {
  'use strict';

  const INTERACTIVE = [
    'button:not([disabled])',
    'a[href]',
    '[role="button"]',
    '[role="tab"]',
    '[role="menuitem"]',
  ].join(',');

  const PRESS_CLASS = 'liquid-fluid-pressed';
  let active = null;

  function isExcluded(element) {
    return element.closest([
      '[disabled]',
      '[aria-disabled="true"]',
      'input',
      'textarea',
      'select',
      '[contenteditable="true"]',
      '.modal-backdrop',
    ].join(','));
  }

  function release(element) {
    if (!(element instanceof HTMLElement)) return;
    element.classList.remove(PRESS_CLASS);
    if (active === element) active = null;
  }

  document.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const target = event.target instanceof Element ? event.target.closest(INTERACTIVE) : null;
    if (!(target instanceof HTMLElement) || isExcluded(target)) return;
    active?.classList.remove(PRESS_CLASS);
    active = target;
    target.classList.add(PRESS_CLASS);
  }, { capture: true, passive: true });

  document.addEventListener('pointerup', () => release(active), { capture: true, passive: true });
  document.addEventListener('pointercancel', () => release(active), { capture: true, passive: true });
  document.addEventListener('pointerleave', () => release(active), { capture: true, passive: true });
  window.addEventListener('blur', () => release(active), { passive: true });
})();
