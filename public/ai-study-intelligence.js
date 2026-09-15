(() => {
  'use strict';

  const STORE_KEY = 'liquid-glass-ai-study-review-v4';
  const LEARNING_KEY = 'liquid-glass-learning-suite-v1';
  const NOTICE_KEY = 'liquid-glass-ai-notified-v1';
  const MODEL = 'gemini-3.6-flash';

  const $ = (root, selector) => root?.querySelector(selector) || null;
  const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
  const parse = (value, fallback) => { try { return JSON.parse(value); } catch { return fallback; } };
  const today = () => new Date().toISOString().slice(0, 10);
  const formatMinutes = (value) => { const n = Math.max(0, Math.round(Number(value) || 0)); if (n < 60) return `${n} min`; const h = Math.floor(n / 60); const m = n % 60; return m ? `${h}h ${m}m` : `${h}h`; };

  const readState = () => {
    const state = parse(localStorage.getItem(STORE_KEY), {}) || {};
    state.loginDays ||= {};
    state.noteOpens ||= {};
    state.sessions ||= [];
    state.pending ||= [];
    state.completedReviews ||= [];
    return state;
  };
  const saveState = (state) => { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch {} };
  const readLearning = () => parse(localStorage.getItem(LEARNING_KEY), {}) || {};

  const markReady = (state) => {
    const now = Date.now(); let changed = false;
    state.pending.forEach((item) => { if (!item.ready && Number(item.releaseAt) <= now) { item.ready = true; changed = true; } });
    if (changed) saveState(state);
  };
  const getReady = (state) => state.pending.filter((item) => item.ready && !state.completedReviews.some((r) => r.pendingId === item.id)).sort((a, b) => Number(b.releaseAt) - Number(a.releaseAt))[0] || null;
  const getPending = (state) => state.pending.filter((item) => !item.ready).sort((a, b) => Number(a.releaseAt) - Number(b.releaseAt))[0] || null;

  const buildPayload = (pending) => {
    const state = readState();
    const learning = readLearning();
    const day = today();
    const todays = state.sessions.filter((s) => new Date(Number(s.completedAt || 0)).toISOString().slice(0, 10) === day);
    const reviews = Object.values(learning.reviews || {}).filter((r) => r && r.reviews > 0);
    const accuracy = reviews.length ? Math.round((reviews.reduce((sum, r) => sum + ((Number(r.correct) || 0) / Math.max(1, Number(r.reviews) || 1)), 0) / reviews.length) * 100) : 0;
    const noteTitles = Object.keys(state.noteOpens[day] || {});
    return {
      today: day,
      login: state.loginDays[day] || null,
      daily: {
        studyMinutes: todays.reduce((sum, s) => sum + (Number(s.focusMinutes) || 0), 0),
        completedSessions: todays.length,
        concepts: [...new Set(todays.map((s) => s.concept).filter(Boolean))],
        notesOpened: noteTitles.reduce((sum, key) => sum + (Number(state.noteOpens[day][key]) || 0), 0),
        noteTitles,
      },
      currentSession: pending?.session || null,
      recentSessions: state.sessions.slice(-8),
      recall: { accuracy, reviewedCount: reviews.length },
      learningActivity: learning.activity || null,
      previousDecision: state.latestDecision || null,
    };
  };

  const callAI = async (phase, payload, answers = null) => {
    const response = await fetch('/api/study-review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phase, payload, answers }) });
    const raw = await response.text();
    const data = parse(raw, null);
    if (!response.ok) throw new Error(data?.error || `AI request failed (${response.status})`);
    return data;
  };

  const showToast = (pending) => {
    const existing = document.querySelector('.ai-ready-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'ai-ready-toast';
    toast.setAttribute('role', 'status');
    toast.innerHTML = `<button type="button" class="ai-ready-toast-main"><span class="ai-ready-toast-icon">✦</span><span><small>AI STUDY INTELLIGENCE</small><strong>Study review ready</strong><em>${escapeHtml(pending?.session?.course || 'Your study session')} · ${formatMinutes(pending?.session?.focusMinutes || 0)} focused</em></span><span class="ai-ready-toast-arrow">›</span></button>`;
    document.body.appendChild(toast);
    const close = () => toast.remove();
    $('.ai-ready-toast-main', toast).addEventListener('click', () => { close(); openReview(pending); });
    window.setTimeout(close, 5000);
  };

  const notifyReady = () => {
    const state = readState(); markReady(state);
    const ready = getReady(state);
    if (!ready) return;
    const notified = parse(localStorage.getItem(NOTICE_KEY), {}) || {};
    if (notified[ready.id]) return;
    notified[ready.id] = Date.now();
    Object.keys(notified).forEach((key) => { if (Date.now() - Number(notified[key]) > 7 * 86400000) delete notified[key]; });
    try { localStorage.setItem(NOTICE_KEY, JSON.stringify(notified)); } catch {}
    showToast(ready);
  };

  const createBackdrop = (className = 'ai-intelligence-backdrop') => {
    const backdrop = document.createElement('div');
    backdrop.className = className;
    backdrop.addEventListener('click', (event) => { if (event.target === backdrop) backdrop.remove(); });
    return backdrop;
  };

  const closeModal = (backdrop) => backdrop?.remove();

  const renderCenter = () => {
    const state = readState(); markReady(state);
    const ready = getReady(state); const pending = getPending(state); const learning = readLearning();
    const day = today();
    const sessions = state.sessions.filter((s) => new Date(Number(s.completedAt || 0)).toISOString().slice(0, 10) === day);
    const studyMinutes = sessions.reduce((sum, s) => sum + (Number(s.focusMinutes) || 0), 0);
    const decision = state.latestDecision;
    const backdrop = createBackdrop();
    backdrop.innerHTML = `<section class="ai-intelligence-modal" role="dialog" aria-modal="true" aria-label="AI Study Intelligence">
      <header class="ai-intelligence-header"><div class="ai-intelligence-title-wrap"><span class="ai-intelligence-eyebrow">REAL AI FEATURE</span><h2>AI Study Intelligence</h2><p>Gemini analyzes your real learning activity and guides what to study next.</p></div><button type="button" class="ai-intelligence-close" aria-label="Close">×</button></header>
      <section class="ai-intelligence-status"><span class="ai-intelligence-status-dot"></span><div><strong>Gemini ${MODEL.replace('gemini-', '').replace('-', ' ')}</strong><small>Live AI backend · study intelligence active</small></div><button type="button" data-ai-check>Check connection</button></section>
      <section class="ai-intelligence-grid">
        <article><span>Today</span><strong>${formatMinutes(studyMinutes)}</strong><small>focused study</small></article>
        <article><span>Sessions</span><strong>${sessions.length}</strong><small>completed today</small></article>
        <article><span>AI reviews</span><strong>${state.completedReviews.length}</strong><small>completed reviews</small></article>
        <article><span>Recall</span><strong>${learning.reviews ? `${Object.values(learning.reviews).filter((r) => r.reviews > 0).length || 0}` : '0'}</strong><small>reviewed concepts</small></article>
      </section>
      <section class="ai-intelligence-card ${ready ? 'is-ready' : pending ? 'is-pending' : ''}"><div class="ai-intelligence-card-head"><div><span>POST-SESSION AI</span><h3>${ready ? 'Review is ready' : pending ? 'Recovery is in progress' : 'Waiting for a completed cycle'}</h3><p>${ready ? `${escapeHtml(ready.session?.course || 'Current course')} · ${escapeHtml(ready.session?.concept || 'Current study goal')}` : pending ? `Your next AI review unlocks ${new Date(Number(pending.releaseAt)).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.` : 'Complete the required study + recovery cycle and the AI will activate automatically.'}</p></div><span class="ai-intelligence-badge">${ready ? 'READY' : pending ? 'RECOVERY' : 'IDLE'}</span></div>${ready ? `<button type="button" class="ai-intelligence-primary" data-ai-open-review>Open AI Study Review <span>→</span></button>` : ''}</section>
      ${decision ? `<section class="ai-intelligence-card ai-intelligence-decision"><span>LAST AI DECISION</span><h3>${escapeHtml(decision.priority || 'Next study focus')}</h3><p>${escapeHtml(decision.reason || '')}</p><div><span>Focus <b>${escapeHtml(decision.focus || '—')}</b></span><span>Next review <b>${escapeHtml(decision.nextReview || '—')}</b></span><span>Session <b>${Number(decision.recommendedMinutes) || 0} min</b></span></div></section>` : '<section class="ai-intelligence-card"><span>AI MEMORY</span><h3>No decision stored yet</h3><p>Your first completed AI Study Review will create the learning decision used by later sessions.</p></section>'}
      <section class="ai-intelligence-features"><span>WHAT AI HANDLES</span><div><span>✦ Session analysis</span><span>✦ Contextual questions</span><span>✦ Weak-area detection</span><span>✦ Next-review planning</span><span>✦ Study-time recommendation</span><span>✦ Cross-session memory</span></div></section>
    </section>`;
    $('.ai-intelligence-close', backdrop).addEventListener('click', () => closeModal(backdrop));
    $('[data-ai-open-review]', backdrop)?.addEventListener('click', () => { closeModal(backdrop); openReview(ready); });
    $('[data-ai-check]', backdrop)?.addEventListener('click', async (event) => {
      const button = event.currentTarget; button.disabled = true; button.textContent = 'Checking…';
      try { await callAI('questions', { today: day, healthCheck: true, daily: { studyMinutes, completedSessions: sessions.length }, currentSession: ready?.session || sessions.at(-1) || null }); button.textContent = 'Connected ✓'; }
      catch (error) { button.textContent = error.message.slice(0, 24); }
      window.setTimeout(() => { button.disabled = false; button.textContent = 'Check connection'; }, 2500);
    });
    document.body.appendChild(backdrop);
  };

  const openReview = async (pending) => {
    if (!pending) return;
    const backdrop = createBackdrop();
    backdrop.innerHTML = `<section class="ai-intelligence-review" role="dialog" aria-modal="true" aria-label="AI Study Review"><header><div><span>AI STUDY INTELLIGENCE</span><h2>Study Review</h2><p>Analyzing your completed session with Gemini.</p></div><button type="button" data-ai-review-close>×</button></header><div data-ai-review-body class="ai-review-loading"><span></span><strong>Analyzing your real study activity…</strong><small>Study time · course · concept · notes · recall · recent activity</small></div></section>`;
    $('[data-ai-review-close]', backdrop).addEventListener('click', () => backdrop.remove());
    document.body.appendChild(backdrop);
    const payload = buildPayload(pending);
    try {
      const result = await callAI('questions', payload);
      const questions = Array.isArray(result?.questions) ? result.questions.slice(0, 3) : [];
      if (questions.length !== 3) throw new Error('AI returned an incomplete review.');
      $('.ai-review-loading', backdrop)?.remove();
      const body = $('[data-ai-review-body]', backdrop);
      body.className = 'ai-review-content';
      body.innerHTML = `<section class="ai-review-summary"><span>AI ANALYSIS</span><p>${escapeHtml(result.summary || '')}</p><div><span><small>Strength</small><b>${escapeHtml(result.strengths || '—')}</b></span><span><small>Weak area</small><b>${escapeHtml(result.weakArea || '—')}</b></span><span><small>Next review</small><b>${escapeHtml(result.nextReview || '—')}</b></span></div></section><form class="ai-review-form"><span class="ai-review-label">3 questions</span>${questions.map((q, i) => `<fieldset><legend>${i + 1}. ${escapeHtml(q.text)}</legend><div>${(Array.isArray(q.options) ? q.options : ['Low','Medium','High']).slice(0, 4).map((opt) => `<label><input type="radio" name="ai-q-${i}" value="${escapeHtml(opt)}" required><span>${escapeHtml(opt)}</span></label>`).join('')}</div></fieldset>`).join('')}<button type="submit">Save answers & generate next decision <span>→</span></button></form>`;
      body.querySelector('form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const answers = questions.map((q, i) => ({ questionId: q.id || `q${i + 1}`, question: q.text, answer: form.querySelector(`input[name="ai-q-${i}"]:checked`)?.value || '' }));
        const submit = form.querySelector('button'); submit.disabled = true; submit.textContent = 'Generating decision…';
        try {
          const decisionResult = await callAI('decision', payload, answers);
          const decision = decisionResult?.decision || decisionResult;
          const state = readState();
          state.completedReviews.push({ id: `review-${Date.now()}`, pendingId: pending.id, completedAt: Date.now(), session: pending.session, payload, analysis: result, answers, decision });
          state.completedReviews = state.completedReviews.slice(-50); state.latestDecision = decision; saveState(state);
          body.innerHTML = `<section class="ai-review-finished"><div>✦</div><span>AI DECISION COMPLETE</span><h3>${escapeHtml(decision.priority || 'Next study focus')}</h3><p>${escapeHtml(decision.reason || '')}</p><div><span>Focus <b>${escapeHtml(decision.focus || '—')}</b></span><span>Next review <b>${escapeHtml(decision.nextReview || '—')}</b></span><span>Recommended session <b>${Number(decision.recommendedMinutes) || 0} min</b></span></div><button type="button" data-ai-review-done>Done</button></section>`;
          $('[data-ai-review-done]', backdrop).addEventListener('click', () => backdrop.remove());
        } catch (error) { submit.disabled = false; submit.textContent = 'Try decision again'; const message = document.createElement('p'); message.className = 'ai-review-error'; message.textContent = error.message; form.appendChild(message); }
      });
    } catch (error) {
      const body = $('[data-ai-review-body]', backdrop); body.className = 'ai-review-error-state'; body.innerHTML = `<strong>AI review could not be completed</strong><p>${escapeHtml(error.message)}</p><button type="button" data-ai-review-retry>Retry</button>`; $('[data-ai-review-retry]', body).addEventListener('click', () => { backdrop.remove(); openReview(pending); });
    }
  };

  const injectLauncher = () => {
    const dashboard = document.querySelector('.dashboard-screen');
    const controls = dashboard?.querySelector('.dashboard-controls');
    if (!controls || controls.querySelector('[data-ai-intelligence-launcher]')) return;
    const legacy = controls.querySelector('.ai-feature-tester-launcher');
    if (legacy) legacy.remove();
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'icon-button ai-study-intelligence-launcher'; button.dataset.aiIntelligenceLauncher = 'true'; button.setAttribute('aria-label', 'AI Study Intelligence'); button.title = 'AI Study Intelligence'; button.innerHTML = '<span aria-hidden="true">✦</span>';
    button.addEventListener('click', renderCenter); controls.insertBefore(button, controls.firstElementChild);
  };

  const boot = () => {
    injectLauncher(); notifyReady();
    window.setInterval(() => { injectLauncher(); notifyReady(); }, 1000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { injectLauncher(); notifyReady(); } });
    window.addEventListener('storage', (event) => { if (event.key === STORE_KEY) notifyReady(); });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
})();
