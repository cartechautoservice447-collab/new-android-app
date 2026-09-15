(() => {
  'use strict';

  const STORAGE_KEY = 'liquid-glass-learning-suite-v1';
  const MAX_NOTE_LENGTH = 12000;
  const REVIEW_STEPS = [1, 2, 4, 7, 14, 30];

  const safeParse = (value, fallback) => {
    try { return JSON.parse(value); } catch { return fallback; }
  };

  const todayKey = () => new Date().toISOString().slice(0, 10);

  function loadState() {
    const stored = safeParse(localStorage.getItem(STORAGE_KEY), null);
    return stored && typeof stored === 'object' ? stored : {
      notes: {},
      reviews: {},
      activity: { studyMinutes: 0, sessions: 0, viewedCourses: 0, viewedCollections: 0, lastLogin: null },
      planner: { date: todayKey(), tasks: [] },
    };
  }

  let state = loadState();
  if (!state.notes) state.notes = {};
  if (!state.reviews) state.reviews = {};
  if (!state.activity) state.activity = { studyMinutes: 0, sessions: 0, viewedCourses: 0, viewedCollections: 0, lastLogin: null };
  if (!state.planner) state.planner = { date: todayKey(), tasks: [] };

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* storage can be unavailable */ }
  }

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[char]));
  }

  function formatMinutes(minutes) {
    const n = Math.max(0, Math.round(minutes));
    if (n < 60) return `${n} min`;
    const h = Math.floor(n / 60);
    const m = n % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }

  function relativeDue(timestamp) {
    if (!timestamp) return 'Ready now';
    const delta = Math.round((timestamp - Date.now()) / 86400000);
    if (delta <= 0) return 'Due now';
    if (delta === 1) return 'Tomorrow';
    return `In ${delta} days`;
  }

  function ensureReviewForNote(note) {
    if (!note?.id || !note.title) return;
    const existing = state.reviews[note.id];
    if (existing) {
      existing.title = note.title;
      existing.sourceText = note.content || existing.sourceText || '';
      existing.updatedAt = note.updatedAt || existing.updatedAt || Date.now();
      return;
    }
    state.reviews[note.id] = {
      id: note.id,
      title: note.title,
      sourceText: (note.content || '').slice(0, MAX_NOTE_LENGTH),
      intervalIndex: 0,
      dueAt: Date.now(),
      reviews: 0,
      correct: 0,
      lapses: 0,
      lastReviewedAt: null,
      updatedAt: note.updatedAt || Date.now(),
    };
  }

  function captureVisibleNotes() {
    const noteCards = document.querySelectorAll('.collection-note-card');
    noteCards.forEach((card) => {
      const title = card.querySelector('strong')?.textContent?.trim();
      const id = card.getAttribute('data-note-id') || `visible-${title}`;
      if (title) ensureReviewForNote({ id, title });
    });

    const editor = document.querySelector('.collection-editor-full');
    if (editor) {
      const title = editor.querySelector('.generated-title-inline input')?.value?.trim();
      const content = [...editor.querySelectorAll('.generated-editor-pane textarea')].map((el) => el.value || '').join('\n\n').trim();
      if (title) {
        const stableId = `editor-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
        ensureReviewForNote({ id: stableId, title, content, updatedAt: Date.now() });
      }
    }

    if (Object.keys(state.reviews).length) saveState();
  }

  function getReviews() {
    captureVisibleNotes();
    const items = Object.values(state.reviews);
    if (!items.length) {
      ensureReviewForNote({ id: 'starter-review', title: 'Your next study concept', content: '' });
      saveState();
      return Object.values(state.reviews);
    }
    return items;
  }

  function isDue(item) { return !item.dueAt || item.dueAt <= Date.now(); }

  function reviewStats() {
    const all = getReviews();
    const due = all.filter(isDue);
    const overdue = all.filter((item) => item.dueAt && item.dueAt < Date.now() - 86400000);
    const reviewed = all.filter((item) => item.reviews > 0);
    const accuracy = reviewed.length ? Math.round((reviewed.reduce((sum, item) => sum + (item.correct / Math.max(1, item.reviews)), 0) / reviewed.length) * 100) : 0;
    return { all, due, overdue, accuracy };
  }

  function ensurePlanner() {
    const today = todayKey();
    if (state.planner.date === today && Array.isArray(state.planner.tasks) && state.planner.tasks.length) return;
    const { due } = reviewStats();
    const tasks = [];
    if (due.length) {
      tasks.push({ id: 'retrieval', title: 'Spaced-repetition review', subtitle: `${Math.min(10, due.length)} concepts ready`, minutes: Math.min(30, Math.max(10, due.length * 3)), done: false });
    }
    const recent = getReviews().filter((item) => item.sourceText).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];
    if (recent) {
      tasks.push({ id: `deep-${recent.id}`, title: `Deep study · ${recent.title}`, subtitle: 'Strengthen the newest learning', minutes: 35, done: false });
    }
    tasks.push({ id: 'break', title: 'Recovery break', subtitle: 'Reset attention before the next block', minutes: 15, done: false, isBreak: true });
    state.planner = { date: today, tasks };
    saveState();
  }

  function recordLogin() {
    const today = todayKey();
    if (state.activity.lastLogin !== today) {
      state.activity.lastLogin = today;
      saveState();
    }
  }

  function icon(name) {
    const paths = {
      brain: '<path d="M9.5 4.5A3 3 0 0 0 4 6.1a3 3 0 0 0 .7 5.8A3.2 3.2 0 0 0 8 15.1V18a2 2 0 0 0 4 0v-2.9a3.2 3.2 0 0 0 3.3-3.2 3 3 0 0 0 .7-5.8A3 3 0 0 0 10.5 4.5z"/><path d="M12 7v9M8 8.5c.9 0 1.5.4 1.9 1M16 8.5c-.9 0-1.5.4-1.9 1"/>',
      calendar: '<rect x="3" y="4" width="18" height="17" rx="4"/><path d="M7 2v4M17 2v4M3 9h18M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01"/>',
      sparkles: '<path d="m12 3 1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
      arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    };
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.sparkles}</svg>`;
  }

  function getActiveModal() {
    const modals = [...document.querySelectorAll('.modal-backdrop .glass-modal')];
    return modals.at(-1) || null;
  }

  function actionFromModal(modal) {
    const title = modal?.querySelector('h2')?.textContent?.trim().toLowerCase();
    if (title === 'study hub') return 'study';
    if (title === 'overview') return 'overview';
    return null;
  }

  function shell(modal, mode) {
    modal.classList.add('learning-suite-modal');
    const title = mode === 'study' ? 'Spaced-Repetition Review' : 'Smart Study Planner';
    const eyebrow = mode === 'study' ? 'Study Hub · Memory' : 'Overview · Adaptive plan';
    const stats = reviewStats();
    modal.innerHTML = `
      <div class="learning-suite-header">
        <button class="learning-suite-back" type="button" data-learning-back aria-label="Back">‹</button>
        <div class="learning-suite-heading">
          <span class="learning-suite-eyebrow">${eyebrow}</span>
          <h2>${title}</h2>
        </div>
        <button class="modal-close learning-suite-close" type="button" aria-label="Close">×</button>
      </div>
      <div class="learning-suite-body" data-learning-body></div>
      <div class="learning-suite-orb" aria-hidden="true"></div>`;
    const body = modal.querySelector('[data-learning-body]');
    modal.querySelector('.learning-suite-back').addEventListener('click', () => {
      if (mode === 'study') renderStudyHome(modal); else renderPlanner(modal);
    });
    modal.querySelector('.learning-suite-close').addEventListener('click', () => {
      modal.closest('.modal-backdrop')?.querySelector('.modal-close')?.click();
      modal.closest('.modal-backdrop')?.remove();
    });
    return { body, stats };
  }

  function renderStudyHome(modal) {
    const { body, stats } = shell(modal, 'study');
    const due = stats.due.slice(0, 6);
    const reviewed = stats.all.filter((item) => item.reviews > 0).length;
    body.innerHTML = `
      <section class="learning-hero-card">
        <div class="learning-icon-orb">${icon('brain')}</div>
        <div>
          <span class="learning-kicker">Ready when you are</span>
          <h3>${stats.due.length ? `${stats.due.length} concepts due` : 'Memory is caught up'}</h3>
          <p>${stats.overdue.length ? `${stats.overdue.length} overdue concepts need priority.` : 'Your next recall session keeps strong memories strong.'}</p>
        </div>
      </section>
      <section class="learning-stat-grid">
        <div class="learning-stat"><span>Recall strength</span><strong>${stats.accuracy || 0}%</strong></div>
        <div class="learning-stat"><span>Reviewed</span><strong>${reviewed}</strong></div>
        <div class="learning-stat"><span>Overdue</span><strong>${stats.overdue.length}</strong></div>
      </section>
      <section class="learning-section-card">
        <div class="learning-section-head"><div><span class="learning-kicker">Today's queue</span><h3>Recall before you reread</h3></div><span class="learning-count">${due.length}</span></div>
        <div class="learning-queue">${due.length ? due.map((item, index) => `
          <div class="learning-queue-item"><span class="queue-index">${String(index + 1).padStart(2, '0')}</span><div><strong>${escapeHtml(item.title)}</strong><small>${relativeDue(item.dueAt)} · ${item.reviews} reviews</small></div></div>`).join('') : '<div class="learning-empty">No reviews are due right now. Next check-in will appear automatically.</div>'}</div>
      </section>
      <button class="learning-primary-button" type="button" data-start-review>${icon('sparkles')}<span>Start adaptive review</span>${icon('arrow')}</button>
      <p class="learning-footnote">The schedule adapts after every recall rating. Weak memories return sooner.</p>`;
    body.querySelector('[data-start-review]').addEventListener('click', () => startReview(modal));
  }

  function startReview(modal) {
    const due = reviewStats().due;
    if (!due.length) {
      const { body } = shell(modal, 'study');
      body.innerHTML = `<section class="learning-complete"><div class="learning-success-orb">✓</div><span class="learning-kicker">All clear</span><h3>Nothing is due.</h3><p>Your next review will return when the memory schedule says it is useful.</p><button class="learning-secondary-button" type="button" data-learning-back>Back to Study Hub</button></section>`;
      body.querySelector('[data-learning-back]').addEventListener('click', () => renderStudyHome(modal));
      return;
    }

    let index = 0;
    function renderQuestion() {
      const item = reviewStats().due[0] || due[index];
      if (!item) { renderStudyHome(modal); return; }
      const { body } = shell(modal, 'study');
      body.innerHTML = `
        <div class="learning-progress"><span>Question ${index + 1} of ${Math.max(1, due.length)}</span><div><i style="width:${Math.max(8, Math.round(((index + 1) / Math.max(1, due.length)) * 100))}%"></i></div></div>
        <section class="learning-question-card">
          <span class="learning-kicker">Retrieval prompt</span>
          <h3>What do you remember about <strong>${escapeHtml(item.title)}</strong>?</h3>
          <p>Pause and retrieve the key idea from memory before revealing your source.</p>
          <button class="learning-reveal" type="button" data-reveal>${icon('sparkles')} Reveal source note</button>
          <div class="learning-source" data-source hidden>${item.sourceText ? escapeHtml(item.sourceText).replace(/\n/g, '<br>') : 'No source text is captured yet. Open this note once to make future reviews more specific.'}</div>
        </section>
        <section class="learning-rating-card">
          <span class="learning-kicker">How well did you recall it?</span>
          <div class="learning-rating-row">
            <button data-rating="again"><strong>Again</strong><small>Forgot</small></button>
            <button data-rating="hard"><strong>Hard</strong><small>Partial</small></button>
            <button data-rating="good"><strong>Good</strong><small>Recalled</small></button>
            <button data-rating="easy"><strong>Easy</strong><small>Instant</small></button>
          </div>
        </section>`;
      body.querySelector('[data-reveal]').addEventListener('click', (event) => {
        const source = body.querySelector('[data-source]');
        source.hidden = !source.hidden;
        event.currentTarget.textContent = source.hidden ? 'Reveal source note' : 'Hide source note';
      });
      body.querySelectorAll('[data-rating]').forEach((button) => button.addEventListener('click', () => {
        rateReview(item, button.dataset.rating);
        index += 1;
        const nextDue = reviewStats().due.filter((candidate) => candidate.id !== item.id);
        if (!nextDue.length) {
          const { body: doneBody } = shell(modal, 'study');
          doneBody.innerHTML = `<section class="learning-complete"><div class="learning-success-orb">✓</div><span class="learning-kicker">Session complete</span><h3>Memory strengthened.</h3><p>Weak concepts were moved closer. Strong concepts were pushed further out.</p><button class="learning-primary-button" type="button" data-done>${icon('arrow')}Return to Study Hub</button></section>`;
          doneBody.querySelector('[data-done]').addEventListener('click', () => renderStudyHome(modal));
        } else renderQuestion();
      }));
    }
    renderQuestion();
  }

  function rateReview(item, rating) {
    const now = Date.now();
    item.reviews += 1;
    item.lastReviewedAt = now;
    if (rating === 'again') {
      item.intervalIndex = 0;
      item.lapses += 1;
      item.dueAt = now + 10 * 60 * 1000;
    } else {
      if (rating === 'hard') item.intervalIndex = Math.max(0, item.intervalIndex);
      if (rating === 'good') item.intervalIndex = Math.min(REVIEW_STEPS.length - 1, item.intervalIndex + 1);
      if (rating === 'easy') item.intervalIndex = Math.min(REVIEW_STEPS.length - 1, item.intervalIndex + 2);
      const days = REVIEW_STEPS[item.intervalIndex] || 1;
      item.dueAt = now + days * 86400000;
      item.correct += 1;
    }
    saveState();
    ensurePlanner();
  }

  function renderPlanner(modal) {
    ensurePlanner();
    const { body, stats } = shell(modal, 'overview');
    const total = state.planner.tasks.reduce((sum, task) => sum + (task.minutes || 0), 0);
    const done = state.planner.tasks.filter((task) => task.done).length;
    const progress = state.planner.tasks.length ? Math.round((done / state.planner.tasks.length) * 100) : 0;
    body.innerHTML = `
      <section class="learning-hero-card planner-hero">
        <div class="learning-icon-orb">${icon('calendar')}</div>
        <div><span class="learning-kicker">Adaptive plan · ${new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span><h3>${progress === 100 ? 'Plan completed' : 'A focused plan for today'}</h3><p>${stats.due.length ? `${stats.due.length} recall concepts are ready to protect your memory.` : 'Your queue is light. Use the time to deepen your newest learning.'}</p></div>
      </section>
      <section class="planner-summary"><div><span>Total focus time</span><strong>${formatMinutes(total)}</strong></div><div><span>Progress</span><strong>${progress}%</strong></div><div><span>Recall queue</span><strong>${stats.due.length}</strong></div></section>
      <section class="learning-section-card">
        <div class="learning-section-head"><div><span class="learning-kicker">Today's rhythm</span><h3>Study in sequence</h3></div><button class="mini-refresh" type="button" data-rebuild-plan>Rebuild</button></div>
        <div class="planner-list">${state.planner.tasks.map((task, index) => `
          <button class="planner-task ${task.done ? 'is-done' : ''} ${task.isBreak ? 'is-break' : ''}" type="button" data-task="${escapeHtml(task.id)}"><span class="planner-number">${String(index + 1).padStart(2, '0')}</span><span class="planner-task-icon">${task.isBreak ? '◌' : '✦'}</span><span class="planner-copy"><strong>${escapeHtml(task.title)}</strong><small>${escapeHtml(task.subtitle)} · ${formatMinutes(task.minutes)}</small></span><span class="planner-check">${task.done ? '✓' : '○'}</span></button>`).join('')}</div>
      </section>
      <button class="learning-primary-button" type="button" data-go-review>${icon('sparkles')}<span>${stats.due.length ? 'Start review first' : 'Open Study Hub'}</span>${icon('arrow')}</button>
      <p class="learning-footnote">Planner logic: overdue recall → weak memory → newest learning → recovery time.</p>`;

    body.querySelectorAll('[data-task]').forEach((button) => button.addEventListener('click', () => {
      const task = state.planner.tasks.find((item) => item.id === button.dataset.task);
      if (!task) return;
      task.done = !task.done;
      saveState();
      renderPlanner(modal);
    }));
    body.querySelector('[data-rebuild-plan]').addEventListener('click', () => {
      state.planner = { date: todayKey(), tasks: [] };
      ensurePlanner();
      renderPlanner(modal);
    });
    body.querySelector('[data-go-review]').addEventListener('click', () => {
      renderStudyHome(modal);
    });
  }

  function enhanceModal(modal) {
    if (!modal || modal.dataset.learningEnhanced === 'true') return;
    const action = actionFromModal(modal);
    if (!action) return;
    modal.dataset.learningEnhanced = 'true';
    recordLogin();
    if (action === 'study') renderStudyHome(modal);
    if (action === 'overview') renderPlanner(modal);
  }

  const observer = new MutationObserver(() => {
    captureVisibleNotes();
    const modal = getActiveModal();
    if (modal) enhanceModal(modal);
  });

  function boot() {
    captureVisibleNotes();
    recordLogin();
    ensurePlanner();
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
