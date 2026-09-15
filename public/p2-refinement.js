(() => {
  'use strict';

  const enhanceNotice = (node) => {
    if (!(node instanceof HTMLElement) || !node.classList.contains('message')) return;
    if (!node.hasAttribute('role')) node.setAttribute('role', 'status');
    if (!node.hasAttribute('aria-live')) node.setAttribute('aria-live', 'polite');
    node.setAttribute('aria-atomic', 'true');
  };

  const scan = (root = document) => {
    root.querySelectorAll?.('.message').forEach(enhanceNotice);
    if (root instanceof HTMLElement) enhanceNotice(root);
  };

  const start = () => {
    scan();
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) scan(node);
        });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  };

  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
