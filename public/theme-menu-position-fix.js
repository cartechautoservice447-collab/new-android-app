(() => {
  function positionMenu() {
    const trigger = document.querySelector('.dashboard-screen .icon-button[aria-label="Theme"]');
    const menu = document.querySelector('.theme-control-menu');
    if (!trigger || !menu) return;
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(menu.offsetWidth || 208, window.innerWidth - 16);
    let left = rect.right - width;
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
    let top = rect.bottom + 9;
    if (top + menu.offsetHeight > window.innerHeight - 8) top = Math.max(8, rect.top - menu.offsetHeight - 9);
    menu.style.position = 'fixed';
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    menu.style.right = 'auto';
  }

  const observer = new MutationObserver(positionMenu);
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('resize', positionMenu, { passive: true });
  window.addEventListener('scroll', positionMenu, { passive: true });
  positionMenu();
})();
