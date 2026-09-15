(() => {
  'use strict';

  const STORE_KEY = 'liquid-glass-ai-study-review-v4';
  const MIN_FOCUS_MINUTES = 5;
  const captured = new WeakSet();

  const read = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key) || ''); } catch { return fallback; }
  };
  const save = (state) => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch {}
  };
  const num = (text, fallback = 0) => Number((String(text || '').match(/([\d.]+)\s*m/i) || [])[1] || fallback);

  function capture(screen) {
    if (!screen || captured.has(screen)) return;
    const status = `${screen.querySelector('.session-live-pill')?.textContent || ''} ${screen.querySelector('.session-clock small')?.textContent || ''}`;
    if (!/complete/i.test(status)) return;

    const mode = screen.querySelector('.session-mode-tabs .is-selected')?.textContent?.trim() || 'Focus';
    if (!/^(Focus|Sprint)$/i.test(mode)) return;

    const focus = num(screen.querySelector('.session-stat-grid .session-stat:first-child strong')?.textContent, 0);
    const rest = num(screen.querySelector('.session-stat-grid .session-stat:nth-child(3) strong')?.textContent, 5);
    if (focus < MIN_FOCUS_MINUTES) return;

    captured.add(screen);
    const course = screen.querySelector('.session-context h2')?.textContent?.trim() || 'Current course';
    const concept = screen.querySelector('.session-context p')?.textContent?.trim() || 'Current study goal';
    const targetText = screen.querySelector('.study-plan-target')?.textContent || '';
    const targetHours = Number((targetText.match(/([\d.]+)\s*hr/i) || [])[1] || 0) || null;

    const state = read(STORE_KEY, { version: 4, loginDays: {}, noteOpens: {}, sessions: [], pending: [], completedReviews: [], latestDecision: null });
    state.loginDays ||= {}; state.noteOpens ||= {}; state.pending ||= {}; state.completedReviews ||= {};
    if (!Array.isArray(state.sessions)) state.sessions = [];
    if (!Array.isArray(state.pending)) state.pending = [];
    if (!Array.isArray(state.completedReviews)) state.completedReviews = [];

    const existing = state.sessions.find((item) => item.shortSessionKey === `${course}|${concept}|${mode}|${focus}|${rest}` && Date.now() - Number(item.completedAt || 0) < 120000);
    if (existing) return;

    const now = Date.now();
    const session = { id: `session-${now}`, startedAt: now - focus * 60000, completedAt: now, focusMinutes: focus, restMinutes: rest, course, concept, mode, targetHours, source: 'short-session-fix' };
    state.sessions.push(session);
    state.sessions = state.sessions.slice(-100);
    state.pending.push({ id: `review-${now}`, sessionId: session.id, releaseAt: now + rest * 60000, ready: rest <= 0, session });
    state.pending = state.pending.slice(-20);
    save(state);
    document.dispatchEvent(new CustomEvent('mobile-study-review-captured'));
  }

  const observer = new MutationObserver(() => {
    document.querySelectorAll('.session-live-pill').forEach((pill) => capture(pill.closest('main') || pill.closest('.screen') || pill.parentElement));
  });
  observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true });
  setInterval(() => document.querySelectorAll('.session-live-pill').forEach((pill) => capture(pill.closest('main') || pill.closest('.screen') || pill.parentElement)), 1500);
})();
