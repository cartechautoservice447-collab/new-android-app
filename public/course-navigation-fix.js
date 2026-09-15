(() => {
  const NAV_SELECTOR = '.dashboard-nav-item, .course-mobile-nav button';
  const ROUTED_KEYS = new Set(['collections', 'notes']);
  const LABELS = { collections: 'Collections', notes: 'All Notes' };
  const RETURNING_CLASS = 'course-nav-direct-dashboard-return';
  let syntheticBack = false;

  function setActive(button) {
    const nav = button.closest('nav');
    if (!nav) return;
    nav.querySelectorAll('[data-dashboard-nav], .course-mobile-nav button').forEach((item) => {
      const key = item.dataset.dashboardNav || item.getAttribute('aria-label')?.toLowerCase();
      item.classList.toggle('active', item === button || key === (button.dataset.dashboardNav || button.getAttribute('aria-label')?.toLowerCase()));
      if (item !== button && item.classList.contains('nav-active')) item.classList.remove('nav-active');
    });
  }

  function findCourseOpener() {
    return document.querySelector('.dashboard-screen .course-dashboard-card .course-open')
      || document.querySelector('.course-folder-screen .course-folder-card');
  }

  function openRealCourseTool(key) {
    const source = findCourseOpener();
    if (!source) return;

    source.click();

    const label = LABELS[key];
    const deadline = performance.now() + 5000;
    const seek = () => {
      const target = [...document.querySelectorAll('.course-tool-folder')].find((button) => {
        const title = button.querySelector('.course-tool-copy strong')?.textContent?.trim();
        return title === label;
      });
      if (target) {
        target.click();
        return;
      }
      if (performance.now() < deadline) requestAnimationFrame(seek);
    };
    requestAnimationFrame(seek);
  }

  function installReturnTransitionStyle() {
    if (document.getElementById('course-navigation-return-style')) return;
    const style = document.createElement('style');
    style.id = 'course-navigation-return-style';
    style.textContent = `
      html.${RETURNING_CLASS} .course-workspace-screen{
        visibility:hidden!important;
        opacity:0!important;
        pointer-events:none!important;
      }
    `;
    document.head.appendChild(style);
  }

  function finishReturn() {
    if (document.querySelector('.dashboard-screen')) {
      document.documentElement.classList.remove(RETURNING_CLASS);
      return true;
    }
    return false;
  }

  function clickWorkspaceBack() {
    const dashboardButton = document.querySelector('.course-workspace-screen .course-workspace-header .back-button');
    if (!dashboardButton) return false;
    syntheticBack = true;
    dashboardButton.click();
    syntheticBack = false;
    return true;
  }

  function returnDirectlyToDashboard(button) {
    installReturnTransitionStyle();
    document.documentElement.classList.add(RETURNING_CLASS);

    if (clickWorkspaceBack()) {
      requestAnimationFrame(() => {
        finishReturn();
      });
      return;
    }

    const observer = new MutationObserver(() => {
      if (finishReturn()) {
        observer.disconnect();
        return;
      }
      if (clickWorkspaceBack()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    requestAnimationFrame(() => {
      if (finishReturn()) observer.disconnect();
    });
  }

  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest(NAV_SELECTOR);
    if (!button) return;

    const key = button.dataset.dashboardNav || button.getAttribute('aria-label')?.toLowerCase();
    if (!ROUTED_KEYS.has(key)) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    setActive(button);
    openRealCourseTool(key);
  }, true);

  // Only intercept the Back controls on the actual Collections and All Notes
  // interfaces. Prevent the original React Back event from running twice;
  // invoke it once under the hidden transition, then immediately return to
  // Dashboard when the Course Workspace is mounted.
  document.addEventListener('click', (event) => {
    if (syntheticBack) return;
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest('.feature-screen .back-button');
    if (!button) return;

    const screen = button.closest('.feature-screen');
    const heading = screen?.querySelector('h1')?.textContent?.trim();
    const label = button.getAttribute('aria-label');
    const isCollectionsBack = heading === 'Collections' && label === 'Back';
    const isAllNotesBack = heading === 'All Notes' && label === 'Back to course';
    if (!isCollectionsBack && !isAllNotesBack) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    document.documentElement.classList.add(RETURNING_CLASS);

    syntheticBack = true;
    button.click();
    syntheticBack = false;

    const settle = () => {
      if (finishReturn()) return;
      if (!clickWorkspaceBack()) requestAnimationFrame(settle);
    };
    requestAnimationFrame(settle);
  }, true);
})();
