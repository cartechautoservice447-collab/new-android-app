/*
 * Single-source glass surface renderer for Course, Saved Notes, and Notes Editor.
 *
 * Type 1/2/3/4 are the existing Engine Settings languages. The three target
 * surfaces below use the same recipe and are hard-synced whenever the engine
 * theme changes or the route renders them. Component CSS is not allowed to
 * restore a permanent alternate glass treatment.
 */

const STYLE_ID = 'mobile-liquid-glass-surface-runtime-lock';
const TARGETS = [
  '.course-dashboard-card .course-open',
  '.collection-note-card',
  '.generated-editor-glass.collection-workspace',
];
const TARGET_SELECTOR = TARGETS.join(',');

const STYLE = `
  html[data-glass-theme] .app-root-layer .course-dashboard-card {
    background: transparent !important;
    background-image: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    border: 0 !important;
    box-shadow: none !important;
    filter: none !important;
    overflow: visible !important;
  }

  html[data-glass-theme] .app-root-layer .course-dashboard-card .course-open,
  html[data-glass-theme] .app-root-layer .collection-note-card,
  html[data-glass-theme] .app-root-layer .generated-editor-glass.collection-workspace {
    position: relative !important;
    box-sizing: border-box !important;
    background-color: var(--glass-theme-bg) !important;
    background-image: var(--glass-theme-sheen) !important;
    backdrop-filter: blur(var(--glass-theme-blur)) saturate(var(--glass-theme-saturation)) contrast(105%) !important;
    -webkit-backdrop-filter: blur(var(--glass-theme-blur)) saturate(var(--glass-theme-saturation)) contrast(105%) !important;
    border: 1px solid var(--glass-theme-border) !important;
    border-top-color: var(--glass-theme-top-border) !important;
    border-radius: var(--glass-theme-radius) !important;
    box-shadow: var(--glass-theme-shadow) !important;
    filter: none !important;
  }

  html[data-glass-theme] .app-root-layer .course-dashboard-card .course-open::before,
  html[data-glass-theme] .app-root-layer .course-dashboard-card .course-open::after,
  html[data-glass-theme] .app-root-layer .collection-note-card::before,
  html[data-glass-theme] .app-root-layer .collection-note-card::after,
  html[data-glass-theme] .app-root-layer .generated-editor-glass.collection-workspace::before,
  html[data-glass-theme] .app-root-layer .generated-editor-glass.collection-workspace::after {
    content: none !important;
    display: none !important;
    filter: none !important;
    background: none !important;
    opacity: 0 !important;
    box-shadow: none !important;
  }

  html[data-glass-theme] .app-root-layer .course-dashboard-card .course-open > *,
  html[data-glass-theme] .app-root-layer .collection-note-card > *,
  html[data-glass-theme] .app-root-layer .generated-editor-glass.collection-workspace > * {
    position: relative !important;
    z-index: 1 !important;
  }

  html[data-glass-theme] .app-root-layer .generated-editor-glass.collection-workspace .generated-editor-topbar,
  html[data-glass-theme] .app-root-layer .generated-editor-glass.collection-workspace .generated-format-toolbar,
  html[data-glass-theme] .app-root-layer .generated-editor-glass.collection-workspace .generated-controls {
    position: relative !important;
    z-index: 2 !important;
  }

  html[data-glass-theme] .app-root-layer .course-dashboard-card:hover,
  html[data-glass-theme] .app-root-layer .collection-note-card:hover {
    filter: brightness(1.03) !important;
  }
`;

const THEME_RECIPES = {
  'type-1': {
    bg: 'var(--water-gel-bg, rgb(255 255 255 / .45))',
    sheen: 'linear-gradient(135deg,rgba(255,255,255,.14) 0%,rgba(255,255,255,.02) 55%,rgba(255,255,255,.09) 100%)',
    border: 'rgba(255,255,255,.22)',
    topBorder: 'rgba(255,255,255,.40)',
    radius: 'calc(18px + var(--liquid-gel,.55) * 26px)',
    shadow: 'inset 0 1px 2px rgba(255,255,255,.35),inset 0 -2px 4px rgba(0,0,0,.18),0 8px 32px rgba(0,0,0,.22)',
    blur: 'var(--liquid-density,12px)',
    saturation: '200%',
  },
  'type-2': {
    bg: 'var(--water-gel-bg, rgb(255 255 255 / .45))',
    sheen: 'linear-gradient(145deg,rgba(255,255,255,.17),rgba(255,255,255,.035) 55%,rgba(255,255,255,.10))',
    border: 'rgba(210,239,255,.24)',
    topBorder: 'rgba(255,255,255,.46)',
    radius: 'calc(18px + var(--liquid-gel,.55) * 26px)',
    shadow: 'inset 0 1px 2px rgba(255,255,255,.48),inset 0 -3px 7px rgba(8,12,50,.20),0 10px 30px rgba(0,0,0,.24)',
    blur: 'var(--liquid-density,12px)',
    saturation: '200%',
  },
  'type-3': {
    bg: 'rgb(255 255 255 / calc(var(--liquid-glass-alpha,.45) * .52))',
    sheen: 'linear-gradient(180deg,rgba(255,255,255,.10),rgba(255,255,255,.025))',
    border: 'rgba(190,235,255,.14)',
    topBorder: 'rgba(255,255,255,.28)',
    radius: '16px',
    shadow: 'inset 0 1px 1px rgba(255,255,255,.16),inset 0 -2px 6px rgba(0,0,0,.12),0 10px 26px rgba(0,0,0,.14)',
    blur: 'calc(var(--liquid-density,12px) * .9)',
    saturation: '180%',
  },
  'type-4': {
    bg: 'var(--water-gel-bg, rgb(255 255 255 / .45))',
    sheen: 'linear-gradient(145deg,rgba(255,255,255,.18) 0%,rgba(255,255,255,.055) 42%,rgba(255,255,255,.02) 62%,rgba(255,255,255,.11) 100%)',
    border: 'rgba(220,240,255,.30)',
    topBorder: 'rgba(255,255,255,.52)',
    radius: 'calc(18px + var(--liquid-gel,.55) * 26px)',
    shadow: 'inset 0 1px 2px rgba(255,255,255,.50),inset 0 -3px 7px rgba(10,14,55,.22),0 9px 28px rgba(0,0,0,.28)',
    blur: 'var(--liquid-density,12px)',
    saturation: '200%',
  },
};

function activeRecipe() {
  const key = document.documentElement.dataset.glassTheme || 'type-1';
  return THEME_RECIPES[key] || THEME_RECIPES['type-1'];
}

function syncThemeVariables() {
  const root = document.documentElement;
  const recipe = activeRecipe();
  root.style.setProperty('--glass-theme-bg', recipe.bg);
  root.style.setProperty('--glass-theme-sheen', recipe.sheen);
  root.style.setProperty('--glass-theme-border', recipe.border);
  root.style.setProperty('--glass-theme-top-border', recipe.topBorder);
  root.style.setProperty('--glass-theme-radius', recipe.radius);
  root.style.setProperty('--glass-theme-shadow', recipe.shadow);
  root.style.setProperty('--glass-theme-blur', recipe.blur);
  root.style.setProperty('--glass-theme-saturation', recipe.saturation);
}

function hardSyncTargets(targets) {
  const recipe = activeRecipe();
  const surfaces = targets || document.querySelectorAll(TARGET_SELECTOR);
  surfaces.forEach((surface) => {
    if (!(surface instanceof HTMLElement)) return;
    const isCollectionWorkspace = surface.classList.contains('generated-editor-glass')
      && surface.classList.contains('collection-workspace');
    const background = isCollectionWorkspace ? 'var(--feature-stage-background)' : recipe.bg;
    const image = isCollectionWorkspace ? 'var(--feature-stage-background)' : recipe.sheen;

    surface.style.setProperty('background-color', isCollectionWorkspace ? 'transparent' : background, 'important');
    surface.style.setProperty('background-image', image, 'important');
    surface.style.setProperty('background-repeat', 'no-repeat', 'important');
    surface.style.setProperty('background-size', 'cover', 'important');
    surface.style.setProperty('background-position', 'center', 'important');
    surface.style.setProperty('backdrop-filter', `blur(${recipe.blur}) saturate(${recipe.saturation}) contrast(105%)`, 'important');
    surface.style.setProperty('-webkit-backdrop-filter', `blur(${recipe.blur}) saturate(${recipe.saturation}) contrast(105%)`, 'important');
    surface.style.setProperty('border', `1px solid ${recipe.border}`, 'important');
    surface.style.setProperty('border-top-color', recipe.topBorder, 'important');
    surface.style.setProperty('border-radius', recipe.radius, 'important');
    surface.style.setProperty('box-shadow', recipe.shadow, 'important');
    surface.style.setProperty('filter', 'none', 'important');
  });
}

function isRelevantMutation(mutations) {
  return mutations.some((mutation) => [...mutation.addedNodes].some((node) => {
    if (!(node instanceof Element)) return false;
    if (node.matches(TARGET_SELECTOR)) return true;
    return Boolean(node.querySelector(TARGET_SELECTOR));
  }));
}

if (typeof document !== 'undefined') {
  syncThemeVariables();

  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = STYLE;

  let syncFrame = 0;
  const sync = () => {
    if (syncFrame) return;
    syncFrame = requestAnimationFrame(() => {
      syncFrame = 0;
      syncThemeVariables();
      hardSyncTargets();
    });
  };

  const themeObserver = new MutationObserver(() => sync());
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-glass-theme'] });

  const bodyObserver = new MutationObserver((mutations) => {
    if (isRelevantMutation(mutations)) sync();
  });
  bodyObserver.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('glass-settings-changed', sync, { passive: true });
  sync();
}
