(() => {
  const THEME_KEY = 'mobile-liquid-glass-theme-ui';
  const THEMES = {
    midnight: { label: 'Midnight Glass' },
    sea: { label: 'Sea Glass' },
  };

  let activeTheme = localStorage.getItem(THEME_KEY) === 'sea' ? 'sea' : 'midnight';
  let menu = null;
  let trigger = null;

  function closeMenu() {
    menu?.remove();
    menu = null;
  }

  function renderMenu() {
    if (!menu) return;
    menu.querySelectorAll('[data-theme-option]').forEach((button) => {
      const selected = button.dataset.themeOption === activeTheme;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-checked', String(selected));
      const check = button.querySelector('.theme-control-check');
      if (check) check.textContent = selected ? '✓' : '';
      const current = button.querySelector('.theme-control-current');
      if (current) current.textContent = selected ? 'Current theme' : 'Select theme';
    });
  }

  function openMenu(nextTrigger) {
    closeMenu();
    trigger = nextTrigger;
    menu = document.createElement('div');
    menu.className = 'theme-control-menu';
    menu.setAttribute('role', 'radiogroup');
    menu.setAttribute('aria-label', 'Theme options');
    menu.innerHTML = `<div class="theme-control-label">Theme</div>
      ${Object.entries(THEMES).map(([key, theme]) => `<button type="button" class="theme-control-option" data-theme-option="${key}" role="radio" aria-label="${theme.label}">
        <span class="theme-control-swatch ${key}"></span>
        <span><span class="theme-control-name">${theme.label}</span><span class="theme-control-current">Select theme</span></span>
        <span class="theme-control-check" aria-hidden="true"></span>
      </button>`).join('')}`;

    document.body.appendChild(menu);
    renderMenu();
    positionMenu();
  }

  function positionMenu() {
    if (!trigger || !menu || !document.body.contains(trigger)) return;
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(208, window.innerWidth - 16);
    const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
    const menuHeight = menu.offsetHeight || 120;
    const below = rect.bottom + 9;
    const top = below + menuHeight <= window.innerHeight - 8
      ? below
      : Math.max(8, rect.top - menuHeight - 9);
    menu.style.position = 'fixed';
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    menu.style.right = 'auto';
    menu.style.bottom = 'auto';
  }

  function isThemeTrigger(target) {
    return target instanceof Element && target.closest('.dashboard-screen .icon-button[aria-label="Theme"]');
  }

  document.addEventListener('click', (event) => {
    const themeTrigger = isThemeTrigger(event.target);
    if (themeTrigger) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      if (menu) closeMenu();
      else openMenu(themeTrigger);
      return;
    }

    if (menu && !(event.target instanceof Element && event.target.closest('.theme-control-menu'))) {
      closeMenu();
    }
  }, true);

  document.addEventListener('click', (event) => {
    const option = event.target instanceof Element ? event.target.closest('[data-theme-option]') : null;
    if (!option || !menu || !menu.contains(option)) return;
    event.preventDefault();
    event.stopPropagation();
    activeTheme = option.dataset.themeOption === 'sea' ? 'sea' : 'midnight';
    localStorage.setItem(THEME_KEY, activeTheme);
    renderMenu();
  }, true);

  window.addEventListener('resize', positionMenu, { passive: true });
  window.addEventListener('scroll', positionMenu, { passive: true });

  const observer = new MutationObserver(positionMenu);
  observer.observe(document.body, { childList: true, subtree: true });
})();
