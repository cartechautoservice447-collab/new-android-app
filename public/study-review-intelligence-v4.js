(() => {
  'use strict';

  const STORE_KEY = 'liquid-glass-ai-study-review-v4';
  const LEARNING_KEY = 'liquid-glass-learning-suite-v1';
  const MIN_FOCUS_MINUTES = 5;
  const HOUR_UNIT_MINUTES = 60;
  const DEFAULT_REST_MINUTES = 10;

  const todayKey = (value = Date.now()) => {
    const d = new Date(value);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const safeParse = (value, fallback) => { try { return JSON.parse(value); } catch { return fallback; } };
  const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[c]));
  const formatMinutes = (value) => {
    const n = Math.max(0, Math.round(Number(value) || 0));
    if (n < 60) return `${n} min`;
    const h = Math.floor(n / 60); const m = n % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  };

  const newState = () => ({ version: 4, loginDays: {}, noteOpens: {}, sessions: [], pending: [], completedReviews: [], latestDecision: null });
  let state = safeParse(localStorage.getItem(STORE_KEY), null);
  if (!state || typeof state !== 'object') state = newState();
  state.loginDays ||= {}; state.noteOpens ||= {}; state.pending ||= []; state.completedReviews ||= [];
  if (!Array.isArray(state.sessions)) state.sessions = [];
  if (!Array.isArray(state.pending)) state.pending = [];
  if (!Array.isArray(state.completedReviews)) state.completedReviews = [];

  const save = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch {} };
  const readLearning = () => safeParse(localStorage.getItem(LEARNING_KEY), null) || { reviews: {}, activity: {} };

  const recordLogin = () => {
    const key = todayKey();
    if (state.loginDays[key]) return;
    state.loginDays[key] = { firstSeenAt: Date.now(), visits: 1 };
    save();
  };

  const noteOpenCount = () => Object.values(state.noteOpens[todayKey()] || {}).reduce((sum, n) => sum + n, 0);
  const recordNoteOpen = (title, course = '') => {
    const clean = String(title || '').trim(); if (!clean) return;
    const day = todayKey(); const key = course ? `${course} · ${clean}` : clean;
    state.noteOpens[day] ||= {}; state.noteOpens[day][key] = (state.noteOpens[day][key] || 0) + 1; save();
  };

  const readSession = (screen) => {
    const course = screen.querySelector('.session-context h2')?.textContent?.trim() || 'Current course';
    const concept = screen.querySelector('.session-context p')?.textContent?.trim() || 'Current study goal';
    const focusText = screen.querySelector('.session-stat-grid .session-stat:first-child strong')?.textContent || '0m';
    const restText = screen.querySelector('.session-stat-grid .session-stat:nth-child(3) strong')?.textContent || `${DEFAULT_REST_MINUTES}m`;
    const mode = screen.querySelector('.session-mode-tabs .is-selected')?.textContent?.trim() || 'Focus';
    const targetText = screen.querySelector('.study-plan-target')?.textContent || '';
    const focus = Number((focusText.match(/([\d.]+)\s*m/i) || [])[1] || 0);
    const rest = Number((restText.match(/([\d.]+)\s*m/i) || [])[1] || DEFAULT_REST_MINUTES);
    const targetHours = Number((targetText.match(/([\d.]+)\s*hr/i) || [])[1] || 0) || null;
    return { course, concept, focus, rest, mode, targetHours };
  };

  const ensureLauncher = () => {
    const header = document.querySelector('.dashboard-screen .dashboard-header');
    if (!header || header.querySelector('.study-review-launcher')) return;
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'study-review-launcher'; button.hidden = true;
    button.innerHTML = `<img class="study-review-icon" src="/study-review-icon.svg" alt="" aria-hidden="true"><span class="study-review-copy"><span class="study-review-eyebrow">AI study review</span><strong class="study-review-title">Your study review is ready</strong><small class="study-review-detail">Open your post-session review</small></span><span class="study-review-arrow" aria-hidden="true">›</span>`;
    button.addEventListener('click', openReview); header.appendChild(button);
  };

  const markReady = () => {
    const now = Date.now(); let changed = false;
    state.pending.forEach((item) => { if (!item.ready && item.releaseAt <= now) { item.ready = true; changed = true; } });
    if (changed) save();
  };
  const getReady = () => state.pending.filter((item) => item.ready && !state.completedReviews.some((x) => x.pendingId === item.id)).sort((a, b) => b.releaseAt - a.releaseAt)[0] || null;
  const getPending = () => state.pending.filter((item) => !item.ready).sort((a, b) => a.releaseAt - b.releaseAt)[0] || null;

  const renderLauncher = () => {
    ensureLauncher(); const launcher = document.querySelector('.study-review-launcher'); if (!launcher) return;
    markReady(); const ready = getReady(); const pending = getPending();
    launcher.hidden = !ready && !pending;
    if (ready) {
      launcher.classList.add('is-ready'); launcher.classList.remove('is-resting');
      launcher.querySelector('.study-review-title').textContent = 'Your study review is ready';
      launcher.querySelector('.study-review-detail').textContent = `${formatMinutes(ready.session.focusMinutes)} study · ${ready.session.restMinutes} min rest completed`;
    } else if (pending) {
      launcher.classList.remove('is-ready'); launcher.classList.add('is-resting');
      const remaining = Math.max(0, Math.ceil((pending.releaseAt - Date.now()) / 60000));
      launcher.querySelector('.study-review-title').textContent = 'Recovery in progress';
      launcher.querySelector('.study-review-detail').textContent = remaining ? `${remaining} min recovery remaining` : 'Review unlocking…';
    }
  };

  const scheduleReadyCheck = () => {
    clearTimeout(scheduleReadyCheck.timer);
    const pending = getPending(); if (!pending) return;
    scheduleReadyCheck.timer = setTimeout(() => { markReady(); renderLauncher(); scheduleReadyCheck(); }, Math.min(60000, Math.max(500, pending.releaseAt - Date.now())));
  };

  const captureCompletedSession = (screen) => {
    const status = `${screen.querySelector('.session-live-pill')?.textContent || ''} ${screen.querySelector('.session-clock small')?.textContent || ''}`;
    if (!/complete/i.test(status)) return;
    const info = readSession(screen);
    if (info.focus < MIN_FOCUS_MINUTES || info.focus + info.rest < HOUR_UNIT_MINUTES) return;
    const token = `${info.course}|${info.concept}|${info.mode}|${screen.dataset.studyReviewStartedAt || 'completed'}`;
    if (screen.dataset.studyReviewCaptured === token) return;
    screen.dataset.studyReviewCaptured = token;
    const session = { id: `session-${Date.now()}`, startedAt: Number(screen.dataset.studyReviewStartedAt || Date.now()), completedAt: Date.now(), focusMinutes: info.focus, restMinutes: info.rest, course: info.course, concept: info.concept, mode: info.mode, targetHours: info.targetHours };
    state.sessions.push(session); state.sessions = state.sessions.slice(-100);
    state.pending.push({ id: `review-${Date.now()}`, sessionId: session.id, releaseAt: Date.now() + info.rest * 60000, ready: false, session });
    state.pending = state.pending.slice(-20); save(); renderLauncher(); scheduleReadyCheck();
  };

  const buildPayload = (pending) => {
    const learning = readLearning(); const today = todayKey();
    const todays = state.sessions.filter((s) => todayKey(s.completedAt) === today);
    const reviews = Object.values(learning.reviews || {}).filter((r) => r && r.reviews > 0);
    const recall = reviews.length ? Math.round((reviews.reduce((sum, r) => sum + ((r.correct || 0) / Math.max(1, r.reviews || 1)), 0) / reviews.length) * 100) : 0;
    const notes = Object.keys(state.noteOpens[today] || {});
    return {
      today,
      login: state.loginDays[today] || null,
      daily: { studyMinutes: todays.reduce((sum, s) => sum + s.focusMinutes, 0), completedSessions: todays.length, concepts: [...new Set(todays.map((s) => s.concept))], notesOpened: noteOpenCount(), noteTitles: notes },
      currentSession: pending.session,
      recentSessions: state.sessions.slice(-8),
      recall: { accuracy: recall, reviewedCount: reviews.length },
      learningActivity: learning.activity || null,
      previousDecision: state.latestDecision,
    };
  };

  const fallbackAnalysis = (payload) => {
    const weak = payload.recall.accuracy && payload.recall.accuracy < 75 ? payload.currentSession.concept : (payload.daily.notesOpened >= 8 ? 'Independent recall' : payload.currentSession.concept);
    return {
      summary: `${formatMinutes(payload.daily.studyMinutes)} of focused study is recorded today across ${payload.daily.completedSessions} completed focus session${payload.daily.completedSessions === 1 ? '' : 's'}. You studied ${payload.currentSession.concept} in ${payload.currentSession.course}.`,
      strengths: payload.daily.studyMinutes >= 45 ? 'You completed a meaningful focus block.' : 'You created useful study momentum.',
      weakArea: weak || 'Still learning',
      nextReview: payload.recall.accuracy && payload.recall.accuracy < 75 ? 'Tomorrow' : 'In 2 days',
      questions: [
        { id: 'confidence', text: `How confident are you explaining ${payload.currentSession.concept} without your notes?`, options: ['Low', 'Medium', 'High'] },
        { id: 'difficulty', text: 'What needed the most effort today?', options: ['Understanding', 'Remembering', 'Applying'] },
        { id: 'next', text: 'What should the next session prioritize?', options: ['Review this', 'Practice this', 'Move forward'] },
      ],
    };
  };

  const callAI = async (payload, phase, answers = null) => {
    const response = await fetch('/api/study-review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phase, payload, answers }) });
    if (!response.ok) throw new Error(`AI review failed: ${response.status}`);
    return response.json();
  };

  const createModal = () => {
    const backdrop = document.createElement('div'); backdrop.className = 'study-review-backdrop';
    backdrop.innerHTML = `<section class="study-review-modal" role="dialog" aria-modal="true" aria-label="AI study review"><button type="button" class="study-review-close" aria-label="Close">×</button><div class="study-review-modal-header"><img src="/study-review-icon.svg" alt="" class="study-review-modal-icon" aria-hidden="true"><div><span class="study-review-eyebrow">AI study intelligence</span><h2>Your study review</h2><p data-review-subtitle>Analyzing your completed study cycle…</p></div></div><div data-review-body></div></section>`;
    backdrop.addEventListener('click', (event) => { if (event.target === backdrop) backdrop.remove(); });
    backdrop.querySelector('.study-review-close').addEventListener('click', () => backdrop.remove());
    document.body.appendChild(backdrop); return backdrop;
  };
  const showLoading = (box) => { box.querySelector('[data-review-body]').innerHTML = `<div class="study-review-loading"><span class="study-review-spinner"></span><strong>Analyzing your study data…</strong><small>Login · study time · concepts · notes · recall</small></div>`; };

  const renderQuestions = (box, pending, payload, data) => {
    const fallback = fallbackAnalysis(payload); const questions = Array.isArray(data?.questions) ? data.questions.slice(0, 3) : [];
    while (questions.length < 3) questions.push(fallback.questions[questions.length]);
    box.querySelector('[data-review-subtitle]').textContent = `${formatMinutes(payload.daily.studyMinutes)} studied today · ${payload.daily.notesOpened} note opens · ${payload.daily.completedSessions} completed focus sessions`;
    box.querySelector('[data-review-body]').innerHTML = `<section class="study-review-data-card"><div><span>Study</span><strong>${formatMinutes(payload.daily.studyMinutes)}</strong></div><div><span>Concepts</span><strong>${payload.daily.concepts.length || 1}</strong></div><div><span>Notes opened</span><strong>${payload.daily.notesOpened}</strong></div><div><span>Recall</span><strong>${payload.recall.accuracy ? `${payload.recall.accuracy}%` : '—'}</strong></div></section><section class="study-review-analysis-card"><span class="study-review-section-label">AI analysis</span><p>${escapeHtml(data?.summary || fallback.summary)}</p><div class="study-review-analysis-row"><span><small>Strength</small><strong>${escapeHtml(data?.strengths || fallback.strengths)}</strong></span><span><small>Weak area</small><strong>${escapeHtml(data?.weakArea || fallback.weakArea)}</strong></span><span><small>Next review</small><strong>${escapeHtml(data?.nextReview || fallback.nextReview)}</strong></span></div></section><form class="study-review-questions-form"><span class="study-review-section-label">3 questions</span><div class="study-review-question-list">${questions.map((q, i) => `<fieldset class="study-review-question"><legend>${i + 1}. ${escapeHtml(q.text)}</legend><div class="study-review-options">${(Array.isArray(q.options) ? q.options : ['Low','Medium','High']).slice(0, 4).map((opt) => `<label><input type="radio" name="study-review-${i}" value="${escapeHtml(opt)}" required><span>${escapeHtml(opt)}</span></label>`).join('')}</div></fieldset>`).join('')}</div><button class="study-review-submit" type="submit">Save answers & make my next decision <span>→</span></button></form>`;
    box.querySelector('form').addEventListener('submit', (event) => submitAnswers(event, box, pending, payload, data, questions));
  };

  const submitAnswers = async (event, box, pending, payload, data, questions) => {
    event.preventDefault(); const form = event.currentTarget;
    const answers = questions.map((q, i) => ({ questionId: q.id || `q${i + 1}`, question: q.text, answer: form.querySelector(`input[name="study-review-${i}"]:checked`)?.value || '' }));
    const fallback = fallbackAnalysis(payload); const button = form.querySelector('button'); button.disabled = true; button.textContent = 'Saving and deciding…';
    let decision = { priority: 'Review this topic', reason: fallback.summary, nextReview: fallback.nextReview, recommendedMinutes: 20, focus: fallback.weakArea };
    try { const result = await callAI(payload, 'decision', answers); decision = result.decision || result; } catch {}
    state.completedReviews.push({ id: `decision-${Date.now()}`, pendingId: pending.id, completedAt: Date.now(), session: pending.session, payload, analysis: data, answers, decision });
    state.completedReviews = state.completedReviews.slice(-50); state.latestDecision = decision; save(); renderDecision(box, decision);
  };

  const renderDecision = (box, decision) => {
    box.querySelector('[data-review-subtitle]').textContent = 'Your activity, answers, and decision are stored for future reviews.';
    box.querySelector('[data-review-body]').innerHTML = `<section class="study-review-decision-card"><span class="study-review-section-label">AI decision</span><h3>${escapeHtml(decision.priority || 'Continue your current study path')}</h3><p>${escapeHtml(decision.reason || 'Your review has been stored for the next cycle.')}</p><div class="study-review-decision-grid"><span><small>Focus</small><strong>${escapeHtml(decision.focus || 'Next study topic')}</strong></span><span><small>Next review</small><strong>${escapeHtml(decision.nextReview || 'Soon')}</strong></span><span><small>Session</small><strong>${escapeHtml(formatMinutes(decision.recommendedMinutes || 20))}</strong></span></div></section><p class="study-review-saved">✓ Activity + analysis + answers + decision stored</p><button type="button" class="study-review-done">Done</button>`;
    box.querySelector('.study-review-done').addEventListener('click', () => box.remove());
  };

  const openReview = async () => {
    const pending = getReady(); if (!pending) return;
    const box = createModal(); showLoading(box); const payload = buildPayload(pending);
    try { const data = await callAI(payload, 'questions'); renderQuestions(box, pending, payload, data); } catch { renderQuestions(box, pending, payload, fallbackAnalysis(payload)); }
  };

  let scanTimer = 0;
  const scan = () => {
    clearTimeout(scanTimer);
    scanTimer = setTimeout(() => {
      recordLogin();
      document.querySelectorAll('.study-session-screen').forEach((screen) => {
        if (!screen.dataset.studyReviewStartedAt) screen.dataset.studyReviewStartedAt = String(Date.now());
        captureCompletedSession(screen);
      });
      markReady(); renderLauncher(); scheduleReadyCheck();
    }, 120);
  };

  document.addEventListener('click', (event) => {
    const note = event.target.closest('.collection-note-card, .course-note-row, .course-note-item');
    if (!note) return;
    const title = note.querySelector('strong, h3, .note-title')?.textContent?.trim();
    const course = document.querySelector('.course-workspace-title h1, .course-workspace-header h1')?.textContent?.trim() || '';
    recordNoteOpen(title, course);
  }, true);

  const observer = new MutationObserver(scan);
  observer.observe(document.body, { childList: true, subtree: true });
  setInterval(() => { markReady(); renderLauncher(); scheduleReadyCheck(); }, 30000);
  window.addEventListener('storage', (event) => { if (event.key === STORE_KEY) { state = safeParse(event.newValue, state) || state; renderLauncher(); } });
  window.studyReview = { getState: () => JSON.parse(JSON.stringify(state)), open: openReview, recordNoteOpen };
  scan();
})();
