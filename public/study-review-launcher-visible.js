(() => {
  'use strict';

  const IDLE_TITLE = 'AI study review';
  const IDLE_DETAIL = 'Complete a full study + rest cycle to unlock your review';

  const sync = () => {
    const launcher = document.querySelector('.dashboard-screen .dashboard-header .study-review-launcher');
    if (!launcher) return;

    const ready = launcher.classList.contains('is-ready');
    const resting = launcher.classList.contains('is-resting');
    if (ready || resting) {
      launcher.removeAttribute('data-review-state');
      return;
    }

    launcher.dataset.reviewState = 'idle';
    launcher.setAttribute('aria-label', 'AI study review. Tap to see how the post-session review works.');

    const title = launcher.querySelector('.study-review-title');
    const detail = launcher.querySelector('.study-review-detail');
    if (title && title.textContent !== IDLE_TITLE) title.textContent = IDLE_TITLE;
    if (detail && detail.textContent !== IDLE_DETAIL) detail.textContent = IDLE_DETAIL;
  };

  const openInfo = (mode) => {
    if (document.querySelector('.study-review-info-backdrop')) return;

    const backdrop = document.createElement('div');
    backdrop.className = 'study-review-backdrop study-review-info-backdrop';
    const isResting = mode === 'resting';
    const title = isResting ? 'Recovery in progress' : 'AI study review';
    const message = isResting
      ? 'Your study block is complete. Finish the required recovery period and this review will unlock.'
      : 'This review becomes active after a complete study + rest cycle. We analyze your study time, concepts, notes, recall, and recent activity, then ask 3 meaningful questions.';

    backdrop.innerHTML = `
      <section class="study-review-modal study-review-info-modal" role="dialog" aria-modal="true" aria-label="${title}">
        <button type="button" class="study-review-close" aria-label="Close">×</button>
        <div class="study-review-modal-header">
          <img src="/study-review-icon.svg" alt="" class="study-review-modal-icon" aria-hidden="true">
          <div>
            <span class="study-review-eyebrow">AI study intelligence</span>
            <h2>${title}</h2>
            <p>${message}</p>
          </div>
        </div>
        <div class="study-review-info-body">
          <div class="study-review-info-step"><strong>1</strong><span><b>Measure</b>Study time, concepts, notes, breaks and recall are collected.</span></div>
          <div class="study-review-info-step"><strong>2</strong><span><b>Analyze</b>AI identifies strengths, weak areas and what deserves attention next.</span></div>
          <div class="study-review-info-step"><strong>3</strong><span><b>Ask</b>You answer only 3 context-specific questions.</span></div>
          <div class="study-review-info-step"><strong>4</strong><span><b>Decide</b>Your answers and activity are stored for the next study decision.</span></div>
        </div>
        <button type="button" class="study-review-done" data-review-info-close>Got it</button>
      </section>`;

    const close = () => backdrop.remove();
    backdrop.addEventListener('click', (event) => { if (event.target === backdrop) close(); });
    backdrop.querySelector('.study-review-close').addEventListener('click', close);
    backdrop.querySelector('[data-review-info-close]').addEventListener('click', close);
    document.body.appendChild(backdrop);
  };

  const handleClick = (event) => {
    const launcher = event.target.closest?.('.study-review-launcher');
    if (!launcher) return;

    if (launcher.classList.contains('is-ready')) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    openInfo(launcher.classList.contains('is-resting') ? 'resting' : 'idle');
  };

  const boot = () => {
    sync();
    const observer = new MutationObserver(() => window.requestAnimationFrame(sync));
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    document.addEventListener('click', handleClick, true);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
