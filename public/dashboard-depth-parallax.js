(() => {
  'use strict';

  // Shared depth interaction for the existing Liquid Glass surfaces across the site.
  // The glass containers themselves are never transformed; only their internal
  // content layers receive tiny, GPU-friendly translations.
  const TARGETS = [
    '.dashboard-screen .course-dashboard-card .course-open',
    '.dashboard-screen .action-card',
    '.dashboard-screen .dashboard-header',
    '.course-folder-screen .course-folder-card',
    '.course-folder-screen .course-search',
    '.course-workspace-screen .course-workspace-hero',
    '.course-workspace-screen .course-workspace-progress',
    '.course-workspace-screen .course-tool-folder',
    '.course-overview-screen .overview-hero',
    '.course-overview-screen .overview-stat',
    '.course-overview-screen .overview-card',
    '.study-session-screen .study-session-hero',
    '.study-session-screen .session-goal-row',
    '.study-session-screen .session-stat',
    '.study-session-screen .study-plan-builder',
    '.collection-workspace-screen .collection-note-card',
    '.collection-workspace-screen .generated-editor-glass',
  ];

  const TARGET_SELECTOR = TARGETS.join(',');
  const LAYER_SELECTORS = {
    course: ['.course-top', '.course-copy', '.course-footer'],
    action: ['.action-icon', '> span:nth-child(2)', '.action-arrow'],
    header: ['.dashboard-copy', '.dashboard-controls'],
    folder: ['.course-folder-icon', '.course-folder-copy', '.course-folder-note-count', '.course-folder-arrow'],
    search: ['svg', 'input'],
    workspaceHero: ['.course-workspace-icon', '.course-workspace-copy'],
    workspaceProgress: ['.course-workspace-progress-heading', '.course-workspace-progress-track', '.course-workspace-progress-meta'],
    workspaceTool: ['.course-tool-index', '.course-tool-icon', '.course-tool-copy', '.course-tool-arrow'],
    overviewHero: ['.overview-hero-top', '.overview-progress-track', '.overview-progress-meta'],
    overviewStat: ['> span', '> strong', '> small'],
    overviewCard: ['.overview-card-heading', '.milestone-list', '.health-meter', '.health-points', '.insight-grid'],
    sessionHero: ['.session-context', '.session-mode-tabs', '.session-clock-wrap', '.session-progress-track', '.session-controls'],
    sessionGoal: ['> div', '> button'],
    sessionStat: ['> span', '> strong', '> small'],
    studyPlan: ['.study-plan-heading', '.study-plan-modes', '.study-plan-duration-card', '.study-plan-summary', '.study-plan-schedule-heading', '.study-plan-schedule'],
    collectionNote: ['> span:first-child', '> div', '> button'],
    editorGlass: ['.collection-mobile-header', '.generated-editor-topbar', '.generated-format-toolbar', '.generated-controls', '.generated-workarea'],
  };

  const MAX_X = 1.8;
  const MAX_Y = 1.35;
  const EASE = 0.16;
  const state = new WeakMap();
  const activeTargets = new Set();
  let raf = 0;
  let observer = null;
  let refreshQueued = false;

  const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const coarsePointer = () => window.matchMedia?.('(pointer: coarse)').matches;

  function groupFor(target) {
    if (target.matches('.course-open')) return 'course';
    if (target.matches('.action-card')) return 'action';
    if (target.matches('.dashboard-header')) return 'header';
    if (target.matches('.course-folder-card')) return 'folder';
    if (target.matches('.course-search')) return 'search';
    if (target.matches('.course-workspace-hero')) return 'workspaceHero';
    if (target.matches('.course-workspace-progress')) return 'workspaceProgress';
    if (target.matches('.course-tool-folder')) return 'workspaceTool';
    if (target.matches('.overview-hero')) return 'overviewHero';
    if (target.matches('.overview-stat')) return 'overviewStat';
    if (target.matches('.overview-card')) return 'overviewCard';
    if (target.matches('.study-session-hero')) return 'sessionHero';
    if (target.matches('.session-goal-row')) return 'sessionGoal';
    if (target.matches('.session-stat')) return 'sessionStat';
    if (target.matches('.study-plan-builder')) return 'studyPlan';
    if (target.matches('.collection-note-card')) return 'collectionNote';
    if (target.matches('.generated-editor-glass')) return 'editorGlass';
    return null;
  }

  function collectLayers(target, group) {
    const layers = [];
    (LAYER_SELECTORS[group] || []).forEach((selector) => {
      let candidates = [];
      if (selector.startsWith('>')) {
        const nth = selector.match(/nth-child\((\d+)\)/)?.[1];
        candidates = [...target.children].filter((el) => {
          if (!nth) return true;
          return String([...target.children].indexOf(el) + 1) === nth;
        });
      } else {
        candidates = [...target.querySelectorAll(selector)];
      }
      candidates.forEach((el) => {
        if (!layers.includes(el)) layers.push(el);
      });
    });
    return layers.filter((el) => el !== target);
  }

  function prepareTarget(target) {
    if (!target || state.has(target) || reducedMotion()) return;
    const group = groupFor(target);
    if (!group) return;
    const layers = collectLayers(target, group);
    if (!layers.length) return;
    layers.forEach((layer, index) => {
      layer.classList.add('depth-parallax-layer');
      layer.dataset.depthFactor = String(0.58 + index * 0.18);
    });
    const data = { layers, goalX: 0, goalY: 0, x: 0, y: 0 };
    state.set(target, data);
    activeTargets.add(target);

    if (coarsePointer()) {
      target.addEventListener('touchstart', onTouchStart, { passive: true });
      target.addEventListener('touchmove', onTouchMove, { passive: true });
      target.addEventListener('touchend', onTouchEnd, { passive: true });
      target.addEventListener('touchcancel', onTouchEnd, { passive: true });
    } else {
      target.addEventListener('pointerenter', onPointerEnter, { passive: true });
      target.addEventListener('pointermove', onPointerMove, { passive: true });
      target.addEventListener('pointerleave', onPointerLeave, { passive: true });
    }
  }

  function refreshTargets() {
    refreshQueued = false;
    if (reducedMotion()) return;
    document.querySelectorAll(TARGET_SELECTOR).forEach(prepareTarget);
    for (const target of activeTargets) {
      if (!target.isConnected) activeTargets.delete(target);
    }
  }

  function queueRefresh() {
    if (refreshQueued) return;
    refreshQueued = true;
    requestAnimationFrame(refreshTargets);
  }

  function point(clientX, clientY, target) {
    const rect = target.getBoundingClientRect();
    return {
      x: Math.max(-1, Math.min(1, ((clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 2)),
      y: Math.max(-1, Math.min(1, ((clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 2)),
    };
  }

  function setGoal(target, x, y) {
    const data = state.get(target);
    if (!data) return;
    data.goalX = x;
    data.goalY = y;
    schedule();
  }

  function onPointerEnter(event) {
    const target = event.currentTarget;
    const p = point(event.clientX, event.clientY, target);
    setGoal(target, p.x * 0.7, p.y * 0.7);
  }

  function onPointerMove(event) {
    if (reducedMotion()) return;
    const target = event.currentTarget;
    const p = point(event.clientX, event.clientY, target);
    setGoal(target, p.x, p.y);
  }

  function onPointerLeave(event) {
    setGoal(event.currentTarget, 0, 0);
  }

  function onTouchStart(event) {
    if (reducedMotion()) return;
    const touch = event.touches?.[0];
    if (!touch) return;
    const target = event.currentTarget;
    const p = point(touch.clientX, touch.clientY, target);
    setGoal(target, p.x * 0.6, p.y * 0.6);
  }

  function onTouchMove(event) {
    if (reducedMotion()) return;
    const touch = event.touches?.[0];
    if (!touch) return;
    const target = event.currentTarget;
    const p = point(touch.clientX, touch.clientY, target);
    setGoal(target, p.x * 0.6, p.y * 0.6);
  }

  function onTouchEnd(event) {
    setGoal(event.currentTarget, 0, 0);
  }

  function schedule() {
    if (!raf) raf = requestAnimationFrame(frame);
  }

  function frame() {
    raf = 0;
    let again = false;
    for (const target of activeTargets) {
      if (!target.isConnected) {
        activeTargets.delete(target);
        continue;
      }
      const data = state.get(target);
      if (!data) continue;
      const moving = Math.abs(data.x - data.goalX) > 0.008 || Math.abs(data.y - data.goalY) > 0.008;
      if (!moving) continue;
      data.x += (data.goalX - data.x) * EASE;
      data.y += (data.goalY - data.y) * EASE;
      const px = data.x * MAX_X;
      const py = data.y * MAX_Y;
      data.layers.forEach((layer) => {
        const factor = Number(layer.dataset.depthFactor) || 1;
        layer.style.transform = `translate3d(${(px * factor).toFixed(2)}px,${(py * factor).toFixed(2)}px,0)`;
      });
      again = true;
    }
    if (again) schedule();
  }

  function boot() {
    if (reducedMotion()) return;
    observer?.disconnect();
    observer = new MutationObserver(() => queueRefresh());
    observer.observe(document.body, { childList: true, subtree: true });
    refreshTargets();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
