(() => {
  'use strict';

  const STORE_KEY = 'liquid-glass-ai-study-review-v4';
  const LEARNING_KEY = 'liquid-glass-learning-suite-v1';

  const parse = (value, fallback) => {
    try { return JSON.parse(value); } catch { return fallback; }
  };

  const esc = (value = '') => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
  const fmt = (value) => {
    const n = Math.max(0, Math.round(Number(value) || 0));
    if (n < 60) return `${n} min`;
    const h = Math.floor(n / 60); const m = n % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  };
  const dayKey = (value = Date.now()) => {
    const d = new Date(value);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const readState = () => {
    const state = parse(localStorage.getItem(STORE_KEY), {}) || {};
    state.sessions = Array.isArray(state.sessions) ? state.sessions : [];
    state.pending = Array.isArray(state.pending) ? state.pending : [];
    state.completedReviews = Array.isArray(state.completedReviews) ? state.completedReviews : [];
    state.noteOpens = state.noteOpens || {};
    state.loginDays = state.loginDays || {};
    return state;
  };

  const readLearning = () => parse(localStorage.getItem(LEARNING_KEY), {}) || {};

  const buildPayload = (state) => {
    const learning = readLearning();
    const today = dayKey();
    const todays = state.sessions.filter((s) => dayKey(Number(s.completedAt || 0)) === today);
    const reviews = Object.values(learning.reviews || {}).filter((r) => r && Number(r.reviews) > 0);
    const accuracy = reviews.length
      ? Math.round((reviews.reduce((sum, r) => sum + ((Number(r.correct) || 0) / Math.max(1, Number(r.reviews) || 1)), 0) / reviews.length) * 100)
      : 0;
    const noteTitles = Object.keys(state.noteOpens[today] || {});
    const ready = state.pending
      .filter((item) => item.ready && !state.completedReviews.some((review) => review.pendingId === item.id))
      .sort((a, b) => Number(b.releaseAt) - Number(a.releaseAt))[0] || null;

    return {
      today,
      login: state.loginDays[today] || null,
      daily: {
        studyMinutes: todays.reduce((sum, s) => sum + (Number(s.focusMinutes) || 0), 0),
        completedSessions: todays.length,
        concepts: [...new Set(todays.map((s) => s.concept).filter(Boolean))],
        notesOpened: noteTitles.reduce((sum, key) => sum + (Number(state.noteOpens[today][key]) || 0), 0),
        noteTitles,
      },
      currentSession: ready?.session || todays.at(-1) || null,
      recentSessions: state.sessions.slice(-8),
      recall: { accuracy, reviewedCount: reviews.length },
      learningActivity: learning.activity || null,
      previousDecision: state.latestDecision || null,
    };
  };

  const callAI = async (phase, payload, answers = null) => {
    const response = await fetch('/api/study-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phase, payload, answers }),
    });
    const raw = await response.text();
    const data = parse(raw, null);
    if (!response.ok) throw new Error(data?.error || `AI request failed (${response.status})`);
    return data;
  };

  const removeLegacy = () => {
    document.querySelectorAll('.ai-feature-tester-launcher, .study-review-launcher').forEach((node) => node.remove());
    document.querySelectorAll('[title="AI Feature Tester"], [aria-label="AI Feature Tester"]').forEach((node) => {
      if (node.closest('.dashboard-screen')) node.remove();
    });
  };

  const addLauncher = () => {
    const dashboard = document.querySelector('.dashboard-screen');
    const controls = dashboard?.querySelector('.dashboard-controls');
    if (!dashboard || !controls) return;

    removeLegacy();
    if (controls.querySelector('[data-ai-intelligence-home]')) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'icon-button ai-study-intelligence-launcher';
    button.dataset.aiIntelligenceHome = 'true';
    button.setAttribute('aria-label', 'AI Study Intelligence');
    button.title = 'AI Study Intelligence';
    button.innerHTML = '<span aria-hidden="true">✦</span>';
    button.addEventListener('click', openCenter);
    controls.insertBefore(button, controls.firstElementChild);
  };

  const createBackdrop = () => {
    const backdrop = document.createElement('div');
    backdrop.className = 'ai-intelligence-backdrop ai-intelligence-home-backdrop';
    backdrop.addEventListener('click', (event) => { if (event.target === backdrop) backdrop.remove(); });
    return backdrop;
  };

  const setStatus = (backdrop, title, detail = '', kind = '') => {
    const box = backdrop.querySelector('[data-ai-home-status]');
    if (!box) return;
    box.className = `ai-intelligence-status ${kind}`;
    box.innerHTML = `<span class="ai-intelligence-status-dot"></span><div><strong>${esc(title)}</strong><small>${esc(detail)}</small></div>`;
  };

  const openCenter = () => {
    if (document.querySelector('.ai-intelligence-home-backdrop')) return;
    const state = readState();
    const payload = buildPayload(state);
    const ready = state.pending.filter((item) => item.ready && !state.completedReviews.some((r) => r.pendingId === item.id)).sort((a, b) => Number(b.releaseAt) - Number(a.releaseAt))[0] || null;
    const pending = state.pending.filter((item) => !item.ready).sort((a, b) => Number(a.releaseAt) - Number(b.releaseAt))[0] || null;
    const sessions = state.sessions.filter((s) => dayKey(Number(s.completedAt || 0)) === payload.today);
    const decision = state.latestDecision || null;
    const backdrop = createBackdrop();

    backdrop.innerHTML = `<section class="ai-intelligence-modal" role="dialog" aria-modal="true" aria-label="AI Study Intelligence">
      <header class="ai-intelligence-header">
        <div class="ai-intelligence-title-wrap"><span class="ai-intelligence-eyebrow">REAL AI FEATURE</span><h2>AI Study Intelligence</h2><p>Your learning activity is analyzed by Gemini to guide what to study next.</p></div>
        <button type="button" class="ai-intelligence-close" data-ai-home-close aria-label="Close">×</button>
      </header>
      <section class="ai-intelligence-status" data-ai-home-status><span class="ai-intelligence-status-dot"></span><div><strong>Gemini 3.6 Flash</strong><small>AI Study Intelligence is available</small></div></section>
      <section class="ai-intelligence-grid">
        <article><span>Today</span><strong>${fmt(payload.daily.studyMinutes)}</strong><small>focused study</small></article>
        <article><span>Sessions</span><strong>${payload.daily.completedSessions}</strong><small>completed today</small></article>
        <article><span>AI reviews</span><strong>${state.completedReviews.length}</strong><small>completed reviews</small></article>
        <article><span>Concepts</span><strong>${payload.daily.concepts.length}</strong><small>studied today</small></article>
      </section>
      <section class="ai-intelligence-card ${ready ? 'is-ready' : pending ? 'is-pending' : ''}">
        <div class="ai-intelligence-card-head"><div><span>AI STUDY REVIEW</span><h3>${ready ? 'Review is ready' : pending ? 'Recovery in progress' : sessions.length ? 'Activity available' : 'Ready for your learning activity'}</h3><p>${ready ? `${esc(ready.session?.course || 'Current course')} · ${fmt(ready.session?.focusMinutes || 0)} focused` : pending ? `Your review unlocks at ${new Date(Number(pending.releaseAt)).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.` : sessions.length ? 'You can ask Gemini to analyze today’s real study activity now.' : 'Complete a study cycle to generate a deeper post-session review.'}</p></div><span class="ai-intelligence-badge">${ready ? 'READY' : pending ? 'RECOVERY' : 'ACTIVE'}</span></div>
        <div class="ai-intelligence-actions">
          <button type="button" class="ai-intelligence-primary" data-ai-home-analyze>${ready ? 'Open AI Study Review' : 'Analyze my activity'} <span>→</span></button>
          <button type="button" class="ai-intelligence-secondary" data-ai-home-check>Check AI connection</button>
        </div>
      </section>
      ${decision ? `<section class="ai-intelligence-card ai-intelligence-decision"><span>LAST AI DECISION</span><h3>${esc(decision.priority || 'Next study focus')}</h3><p>${esc(decision.reason || '')}</p><div><span>Focus <b>${esc(decision.focus || '—')}</b></span><span>Next review <b>${esc(decision.nextReview || '—')}</b></span><span>Session <b>${Number(decision.recommendedMinutes) || 0} min</b></span></div></section>` : '<section class="ai-intelligence-card"><span>AI MEMORY</span><h3>Your first AI decision starts here</h3><p>After the first review, Gemini can use the saved decision as context for later recommendations.</p></section>'}
      <section class="ai-intelligence-features"><span>AI FEATURES</span><div><span>✦ Real session analysis</span><span>✦ Contextual questions</span><span>✦ Weak-area detection</span><span>✦ Next-review planning</span><span>✦ Study-time recommendation</span><span>✦ Learning memory</span><span>✦ 5-second ready notification</span></div></section>
    </section>`;

    backdrop.querySelector('[data-ai-home-close]').addEventListener('click', () => backdrop.remove());
    backdrop.querySelector('[data-ai-home-check]').addEventListener('click', async (event) => {
      const button = event.currentTarget;
      button.disabled = true;
      setStatus(backdrop, 'Checking Gemini connection…', 'Sending a real request to /api/study-review', '');
      try {
        await callAI('questions', { today: payload.today, healthCheck: true, daily: payload.daily, currentSession: payload.currentSession });
        setStatus(backdrop, 'Gemini connected ✓', 'The AI Study Review backend responded successfully.', '');
      } catch (error) {
        setStatus(backdrop, 'AI connection failed', error.message, '');
      } finally {
        button.disabled = false;
      }
    });

    backdrop.querySelector('[data-ai-home-analyze]').addEventListener('click', async () => {
      const button = backdrop.querySelector('[data-ai-home-analyze]');
      button.disabled = true;
      setStatus(backdrop, 'Analyzing your learning activity…', 'Gemini is generating your contextual review.', '');
      try {
        const reviewPayload = ready ? buildPayload(state) : payload;
        const result = await callAI('questions', reviewPayload);
        const questions = Array.isArray(result?.questions) ? result.questions.slice(0, 3) : [];
        if (questions.length !== 3) throw new Error('Gemini returned an incomplete three-question review.');
        renderReview(backdrop, state, reviewPayload, result, questions);
      } catch (error) {
        setStatus(backdrop, 'AI review failed', error.message, '');
        button.disabled = false;
      }
    });

    document.body.appendChild(backdrop);
  };

  const renderReview = (backdrop, state, payload, result, questions) => {
    const modal = backdrop.querySelector('.ai-intelligence-modal');
    modal.innerHTML = `<header class="ai-intelligence-header"><div><span class="ai-intelligence-eyebrow">AI STUDY INTELLIGENCE</span><h2>Study Review</h2><p>Gemini analyzed your current learning activity.</p></div><button type="button" class="ai-intelligence-close" data-ai-review-close aria-label="Close">×</button></header>
      <section class="ai-review-content"><section class="ai-review-summary"><span>AI ANALYSIS</span><p>${esc(result.summary || '')}</p><div><span><small>Strength</small><b>${esc(result.strengths || '—')}</b></span><span><small>Weak area</small><b>${esc(result.weakArea || '—')}</b></span><span><small>Next review</small><b>${esc(result.nextReview || '—')}</b></span></div></section>
      <form class="ai-review-form"><span class="ai-review-label">3 questions</span>${questions.map((q, i) => `<fieldset><legend>${i + 1}. ${esc(q.text)}</legend><div>${(Array.isArray(q.options) ? q.options : ['Low','Medium','High']).slice(0, 4).map((opt) => `<label><input type="radio" name="ai-home-q-${i}" value="${esc(opt)}" required><span>${esc(opt)}</span></label>`).join('')}</div></fieldset>`).join('')}<button type="submit">Save answers & generate next decision <span>→</span></button></form></section>`;

    modal.querySelector('[data-ai-review-close]').addEventListener('click', () => backdrop.remove());
    modal.querySelector('form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const button = form.querySelector('button');
      const answers = questions.map((q, i) => ({ questionId: q.id || `q${i + 1}`, question: q.text, answer: form.querySelector(`input[name="ai-home-q-${i}"]:checked`)?.value || '' }));
      button.disabled = true;
      button.textContent = 'Generating your next decision…';
      try {
        const response = await callAI('decision', payload, answers);
        const decision = response?.decision || response;
        state.completedReviews.push({ id: `review-${Date.now()}`, completedAt: Date.now(), session: payload.currentSession, payload, analysis: result, answers, decision, pendingId: state.pending.find((item) => item.ready && item.sessionId === payload.currentSession?.id)?.id || null });
        state.completedReviews = state.completedReviews.slice(-50);
        state.latestDecision = decision;
        try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch {}
        modal.innerHTML = `<header class="ai-intelligence-header"><div><span class="ai-intelligence-eyebrow">AI DECISION COMPLETE</span><h2>Your next study move</h2><p>Saved for future AI recommendations.</p></div><button type="button" class="ai-intelligence-close" data-ai-review-close aria-label="Close">×</button></header><section class="ai-review-finished"><div>✦</div><span>RECOMMENDED NEXT STEP</span><h3>${esc(decision.priority || 'Continue your study plan')}</h3><p>${esc(decision.reason || '')}</p><div><span>Focus <b>${esc(decision.focus || '—')}</b></span><span>Next review <b>${esc(decision.nextReview || '—')}</b></span><span>Recommended session <b>${Number(decision.recommendedMinutes) || 0} min</b></span></div><button type="button" data-ai-review-done>Done</button></section>`;
        modal.querySelectorAll('[data-ai-review-close], [data-ai-review-done]').forEach((node) => node.addEventListener('click', () => backdrop.remove()));
      } catch (error) {
        button.disabled = false;
        button.textContent = `Try again · ${error.message}`;
      }
    });
  };

  const boot = () => {
    addLauncher();
    const observer = new MutationObserver(() => window.requestAnimationFrame(addLauncher));
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('popstate', addLauncher);
    window.addEventListener('pageshow', addLauncher);
    setInterval(addLauncher, 1500);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
