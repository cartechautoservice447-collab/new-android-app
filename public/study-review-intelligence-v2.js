(() => {
  'use strict';

  const STORE_KEY = 'liquid-glass-ai-study-review-v2';
  const LEARNING_KEY = 'liquid-glass-learning-suite-v1';
  const MIN_REVIEW_FOCUS_MINUTES = 5;

  const todayKey = (date = new Date()) => {
    const now = date instanceof Date ? date : new Date(date);
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };
  const safeParse = (value, fallback) => { try { return JSON.parse(value); } catch { return fallback; } };
  const defaultState = () => ({ version: 2, loginDays: {}, noteOpens: {}, sessions: [], pending: [], completedReviews: [], latestDecision: null });

  let state = safeParse(localStorage.getItem(STORE_KEY), null);
  if (!state || typeof state !== 'object') state = defaultState();
  state.loginDays ||= {};
  state.noteOpens ||= {};
  state.sessions ||= [];
  state.pending ||= [];
  state.completedReviews ||= [];

  const save = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch {} };
  const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
  const formatMinutes = (minutes) => { const n = Math.max(0, Math.round(Number(minutes) || 0)); if (n < 60) return `${n} min`; const h = Math.floor(n / 60); const m = n % 60; return m ? `${h}h ${m}m` : `${h}h`; };
  const readLearning = () => safeParse(localStorage.getItem(LEARNING_KEY), null) || { notes: {}, reviews: {}, activity: { studyMinutes: 0, sessions: 0, viewedCourses: 0, viewedCollections: 0, lastLogin: null } };

  const loginToday = () => { const today = todayKey(); if (state.loginDays[today]) return; state.loginDays[today] = { firstSeenAt: Date.now(), visits: 1 }; save(); };
  const getTodayNoteOpens = () => Object.values(state.noteOpens[todayKey()] || {}).reduce((sum, count) => sum + count, 0);
  const recordNoteOpen = (title, course = '') => {
    const cleanTitle = String(title || '').trim(); if (!cleanTitle) return;
    const today = todayKey(); state.noteOpens[today] ||= {};
    const key = course ? `${course} · ${cleanTitle}` : cleanTitle;
    state.noteOpens[today][key] = (state.noteOpens[today][key] || 0) + 1; save();
  };

  const readCourseAndGoal = (screen) => ({
    course: screen.querySelector('.session-context h2')?.textContent?.trim() || 'Current course',
    concept: screen.querySelector('.session-context p')?.textContent?.trim() || 'Current study goal',
  });
  const readSessionMinutes = (screen) => { const value = screen.querySelector('.session-stat-grid .session-stat:first-child strong')?.textContent || ''; const match = value.match(/(\d+(?:\.\d+)?)\s*m/i); return match ? Number(match[1]) : 0; };
  const readRestMinutes = (screen) => { const text = screen.querySelector('.session-stat-grid .session-stat:nth-child(3) strong')?.textContent || ''; const match = text.match(/(\d+(?:\.\d+)?)\s*m/i); return match ? Number(match[1]) : 5; };
  const readPlanTarget = (screen) => { const text = screen.querySelector('.study-plan-target')?.textContent || ''; const match = text.match(/(\d+(?:\.\d+)?)\s*hr/i); return match ? Number(match[1]) : null; };
  const sessionFingerprint = (screen) => { const { course, concept } = readCourseAndGoal(screen); return `${course}|${concept}|${screen.dataset.studyReviewStartedAt || ''}`; };

  const ensureLauncher = () => {
    const header = document.querySelector('.dashboard-screen .dashboard-header'); if (!header || header.querySelector('.study-review-launcher')) return;
    const launcher = document.createElement('button'); launcher.type = 'button'; launcher.className = 'study-review-launcher'; launcher.hidden = true;
    launcher.innerHTML = `<img class="study-review-icon" src="/study-review-icon.png" alt="" aria-hidden="true" /><span class="study-review-copy"><span class="study-review-eyebrow">AI study review</span><strong class="study-review-title">Your study review is ready</strong><small class="study-review-detail">Open your post-session review</small></span><span class="study-review-arrow" aria-hidden="true">›</span>`;
    launcher.addEventListener('click', openReview); header.appendChild(launcher);
  };

  const renderLauncher = () => {
    ensureLauncher(); const launcher = document.querySelector('.study-review-launcher'); if (!launcher) return;
    const ready = latestReady();
    const pending = state.pending.filter((item) => !item.ready).sort((a, b) => b.releaseAt - a.releaseAt)[0];
    if (ready) {
      launcher.hidden = false; launcher.classList.remove('is-resting'); launcher.classList.add('is-ready');
      launcher.querySelector('.study-review-title').textContent = 'Your study review is ready';
      launcher.querySelector('.study-review-detail').textContent = `${formatMinutes(ready.session.focusMinutes)} study · ${ready.session.restMinutes} min rest completed`;
      return;
    }
    if (pending) {
      launcher.hidden = false; launcher.classList.add('is-resting'); launcher.classList.remove('is-ready');
      const remaining = Math.max(0, Math.ceil((pending.releaseAt - Date.now()) / 60000));
      launcher.querySelector('.study-review-title').textContent = 'Recovery in progress';
      launcher.querySelector('.study-review-detail').textContent = remaining > 0 ? `${remaining} min recovery remaining` : 'Review unlocking…';
      return;
    }
    launcher.hidden = true;
  };

  const markReady = () => { let changed = false; const now = Date.now(); state.pending.forEach((item) => { if (!item.ready && item.releaseAt <= now) { item.ready = true; changed = true; } }); if (changed) save(); renderLauncher(); };
  const scheduleReadyCheck = () => {
    const next = state.pending.filter((item) => !item.ready).sort((a, b) => a.releaseAt - b.releaseAt)[0]; if (!next) return;
    const delay = Math.min(60000, Math.max(500, next.releaseAt - Date.now())); clearTimeout(scheduleReadyCheck.timer);
    scheduleReadyCheck.timer = setTimeout(() => { markReady(); scheduleReadyCheck(); }, delay);
  };
  const latestReady = () => { markReady(); return state.pending.filter((item) => item.ready && !state.completedReviews.some((review) => review.pendingId === item.id)).sort((a, b) => b.releaseAt - a.releaseAt)[0] || null; };

  const markSessionComplete = (screen) => {
    const status = screen.querySelector('.session-live-pill')?.textContent?.trim() || '';
    const completed = /session complete/i.test(status) || /complete/i.test(screen.querySelector('.session-clock small')?.textContent || ''); if (!completed) return;
    const fingerprint = sessionFingerprint(screen); if (screen.dataset.studyReviewCompleted === fingerprint) return;
    const minutes = readSessionMinutes(screen); if (minutes < MIN_REVIEW_FOCUS_MINUTES) return;
    const restMinutes = readRestMinutes(screen);
    // One complete review unit is the default one-hour Deep Study cycle: 50m focus + 10m recovery.
    if (minutes + restMinutes < 60) return;

    screen.dataset.studyReviewCompleted = fingerprint;
    const { course, concept } = readCourseAndGoal(screen); const targetHours = readPlanTarget(screen);
    const session = { id: `session-${Date.now()}`, startedAt: Number(screen.dataset.studyReviewStartedAt || Date.now()), completedAt: Date.now(), focusMinutes: minutes, restMinutes, course, concept, targetHours, mode: screen.querySelector('.session-mode-tabs .is-selected')?.textContent?.trim() || 'Focus', notesOpenedBefore: getTodayNoteOpens() };
    state.sessions.push(session); state.sessions = state.sessions.slice(-100);
    const releaseAt = Date.now() + restMinutes * 60 * 1000;
    state.pending.push({ id: `review-${Date.now()}`, sessionId: session.id, releaseAt, restMinutes, ready: false, session });
    state.pending = state.pending.slice(-20); save(); renderLauncher(); scheduleReadyCheck();
  };

  const buildPayload = (pending) => {
    const learning = readLearning(); const today = todayKey();
    const daySessions = state.sessions.filter((item) => todayKey(item.completedAt) === today);
    const concepts = [...new Set(daySessions.map((item) => item.concept).filter(Boolean))];
    const openMap = state.noteOpens[today] || {}; const noteTitles = Object.keys(openMap);
    const reviewed = Object.values(learning.reviews || {}).filter((item) => item && item.reviews > 0);
    const recallAccuracy = reviewed.length ? Math.round((reviewed.reduce((sum, item) => sum + ((item.correct || 0) / Math.max(1, item.reviews || 1)), 0) / reviewed.length) * 100) : 0;
    return {
      today,
      login: state.loginDays[today] || null,
      daily: { studyMinutes: daySessions.reduce((sum, item) => sum + (item.focusMinutes || 0), 0), completedSessions: daySessions.length, concepts, notesOpened: getTodayNoteOpens(), noteTitles, focusSessions: daySessions },
      currentSession: pending?.session || null,
      recentSessions: state.sessions.slice(-8),
      recall: { accuracy: recallAccuracy, reviewedCount: reviewed.length },
      learningActivity: learning.activity || null,
      latestDecision: state.latestDecision,
    };
  };

  const deterministicAnalysis = (payload) => {
    const minutes = payload.daily.studyMinutes, current = payload.currentSession || {}, notes = payload.daily.notesOpened, recall = payload.recall.accuracy, focus = current.concept || current.course || 'today’s study';
    let insight = `${formatMinutes(minutes)} of focused study is recorded today.`;
    if (notes >= 8) insight += ' Your notes were revisited frequently; test recall before rereading again.';
    if (recall && recall < 75) insight += ' Recent recall is below your stronger range, so the next review should stay close.';
    insight += ` The session centered on ${focus}.`;
    return { summary: insight, strengths: minutes >= 45 ? 'You completed a meaningful focus block.' : 'You still created useful study momentum.', weakArea: recall && recall < 75 ? focus : (notes >= 8 ? 'Independent recall' : 'Not enough signal yet'), nextReview: recall && recall < 75 ? 'Tomorrow' : 'In 2 days', questions: [
      { id: 'confidence', text: `How confident are you that you can explain ${focus} without opening your notes?`, options: ['Low', 'Medium', 'High'] },
      { id: 'difficulty', text: 'What needed the most effort today?', options: ['Understanding', 'Remembering', 'Applying'] },
      { id: 'next', text: 'What should the next session prioritize?', options: ['Review this', 'Practice this', 'Move forward'] },
    ] };
  };

  const callAI = async (payload, phase, answers = null) => {
    const response = await fetch('/api/study-review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phase, payload, answers }) });
    if (!response.ok) throw new Error(`AI review failed (${response.status})`); const data = await response.json(); if (!data || typeof data !== 'object') throw new Error('Invalid AI review response'); return data;
  };

  const createModal = () => {
    const backdrop = document.createElement('div'); backdrop.className = 'study-review-backdrop';
    backdrop.innerHTML = `<section class="study-review-modal" role="dialog" aria-modal="true" aria-label="AI study review"><button type="button" class="study-review-close" aria-label="Close">×</button><div class="study-review-modal-header"><img src="/study-review-icon.png" alt="" class="study-review-modal-icon" aria-hidden="true" /><div><span class="study-review-eyebrow">AI study intelligence</span><h2>Your study review</h2><p data-review-subtitle>Analyzing your completed study cycle…</p></div></div><div data-review-body></div></section>`;
    backdrop.addEventListener('click', (event) => { if (event.target === backdrop) backdrop.remove(); }); backdrop.querySelector('.study-review-close').addEventListener('click', () => backdrop.remove()); document.body.appendChild(backdrop); return backdrop;
  };
  const setModalLoading = (modal) => { modal.querySelector('[data-review-body]').innerHTML = `<div class="study-review-loading"><span class="study-review-spinner"></span><strong>Analyzing today’s activity…</strong><small>Study time · concepts · notes · previous recall</small></div>`; };

  const renderQuestions = (modal, pending, payload, data) => {
    const fallback = deterministicAnalysis(payload); const questions = (data.questions || []).slice(0, 3); while (questions.length < 3) questions.push(fallback.questions[questions.length]);
    modal.querySelector('[data-review-subtitle]').textContent = `${formatMinutes(payload.daily.studyMinutes)} studied today · ${payload.daily.notesOpened} note opens · ${payload.daily.completedSessions} completed focus sessions`;
    modal.querySelector('[data-review-body]').innerHTML = `<section class="study-review-data-card"><div><span>Study</span><strong>${escapeHtml(formatMinutes(payload.daily.studyMinutes))}</strong></div><div><span>Concepts</span><strong>${escapeHtml(String(payload.daily.concepts.length || 1))}</strong></div><div><span>Notes opened</span><strong>${escapeHtml(String(payload.daily.notesOpened))}</strong></div><div><span>Recall</span><strong>${payload.recall.accuracy ? `${payload.recall.accuracy}%` : '—'}</strong></div></section><section class="study-review-analysis-card"><span class="study-review-section-label">AI analysis</span><p>${escapeHtml(data.summary || data.analysis || fallback.summary)}</p><div class="study-review-analysis-row"><span><small>Strength</small><strong>${escapeHtml(data.strengths || 'Study momentum')}</strong></span><span><small>Weak area</small><strong>${escapeHtml(data.weakArea || 'Still learning')}</strong></span><span><small>Next review</small><strong>${escapeHtml(data.nextReview || 'Soon')}</strong></span></div></section><form class="study-review-questions-form"><span class="study-review-section-label">3 questions</span><div class="study-review-question-list">${questions.map((question, index) => `<fieldset class="study-review-question"><legend>${index + 1}. ${escapeHtml(question.text)}</legend><div class="study-review-options">${(Array.isArray(question.options) ? question.options : ['Low', 'Medium', 'High']).slice(0, 4).map((option) => `<label><input type="radio" name="study-review-${index}" value="${escapeHtml(option)}" required /><span>${escapeHtml(option)}</span></label>`).join('')}</div></fieldset>`).join('')}</div><button type="submit" class="study-review-submit">Save answers & make my next decision <span>→</span></button></form>`;
    modal.querySelector('form').addEventListener('submit', (event) => submitReview(event, modal, pending, payload, data, questions));
  };

  const submitReview = async (event, modal, pending, payload, data, questions) => {
    event.preventDefault(); const form = event.currentTarget;
    const answers = questions.map((question, index) => ({ questionId: question.id || `q${index + 1}`, question: question.text, answer: form.querySelector(`input[name="study-review-${index}"]:checked`)?.value || '' }));
    const fallback = deterministicAnalysis(payload); const submit = form.querySelector('button[type="submit"]'); submit.disabled = true; submit.textContent = 'Saving and deciding…';
    let decision = { priority: fallback.questions[2].options[0], reason: fallback.summary, nextReview: fallback.nextReview, recommendedMinutes: 20, focus: fallback.weakArea };
    try { const result = await callAI(payload, 'decision', answers); decision = result.decision || result; } catch {}
    const record = { id: `decision-${Date.now()}`, pendingId: pending.id, completedAt: Date.now(), session: pending.session, payload, initialAnalysis: data, answers, decision };
    state.completedReviews.push(record); state.completedReviews = state.completedReviews.slice(-50); state.latestDecision = decision; save(); renderDecision(modal, record);
  };

  const renderDecision = (modal, record) => {
    const decision = record.decision || {};
    modal.querySelector('[data-review-subtitle]').textContent = 'Saved to your local study intelligence history.';
    modal.querySelector('[data-review-body]').innerHTML = `<section class="study-review-decision-card"><span class="study-review-section-label">AI decision</span><h3>${escapeHtml(decision.priority || 'Continue with your current study path')}</h3><p>${escapeHtml(decision.reason || 'Your answers and study activity have been stored for the next review cycle.')}</p><div class="study-review-decision-grid"><span><small>Focus</small><strong>${escapeHtml(decision.focus || 'Next study topic')}</strong></span><span><small>Next review</small><strong>${escapeHtml(decision.nextReview || 'Soon')}</strong></span><span><small>Session</small><strong>${escapeHtml(formatMinutes(decision.recommendedMinutes || 20))}</strong></span></div></section><p class="study-review-saved">✓ Activity, analysis, answers and decision stored.</p><button type="button" class="study-review-done">Done</button>`;
    modal.querySelector('.study-review-done').addEventListener('click', () => modal.closest('.study-review-backdrop')?.remove());
  };

  const openReview = async () => {
    const pending = latestReady(); if (!pending) return; const modal = createModal(); const payload = buildPayload(pending); const fallback = deterministicAnalysis(payload); setModalLoading(modal);
    try { const data = await callAI(payload, 'questions'); renderQuestions(modal, pending, payload, data.questions?.length === 3 ? data : fallback); } catch { renderQuestions(modal, pending, payload, fallback); }
  };

  const scan = () => { loginToday(); document.querySelectorAll('.study-session-screen').forEach((screen) => { captureStudyStart(screen); markSessionComplete(screen); }); markReady(); renderLauncher(); scheduleReadyCheck(); };
  document.addEventListener('click', (event) => { const note = event.target.closest('.collection-note-card, .course-note-row, .course-note-item'); if (note) { const title = note.querySelector('strong, h3, .note-title')?.textContent?.trim(); const course = document.querySelector('.course-workspace-title h1, .course-workspace-header h1')?.textContent?.trim() || ''; recordNoteOpen(title, course); } }, true);
  const observer = new MutationObserver(() => { clearTimeout(scan.timer); scan.timer = setTimeout(scan, 160); }); observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('study-review-ready', renderLauncher);
  window.addEventListener('storage', (event) => { if (event.key === STORE_KEY) { state = safeParse(event.newValue, state) || state; renderLauncher(); } });
  window.studyReview = { getState: () => JSON.parse(JSON.stringify(state)), open: openReview, recordNoteOpen };
  scan();
})();
