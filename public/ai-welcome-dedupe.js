(() => {
  'use strict';

  const clean = () => {
    document.querySelectorAll('.ai-study-intelligence-launcher').forEach((node) => {
      if (!node.matches('[data-ai-intelligence-home]')) node.remove();
    });
    document.querySelectorAll('.study-review-launcher, .ai-feature-tester-launcher').forEach((node) => node.remove());
    document.querySelectorAll('[title="AI Feature Tester"], [aria-label="AI Feature Tester"]').forEach((node) => node.remove());
  };

  const boot = () => {
    clean();
    const observer = new MutationObserver(clean);
    observer.observe(document.body, { childList: true, subtree: true });
    setInterval(clean, 1000);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
