import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from './lib/supabase.js';

export const ENGINE_DEFAULTS = {
  displayName: '',
  uiTextClarity: 'default',
  performance: 'high',
  theme: 'light',
  glassTheme: 'type-1',
  pureBlack: false,
  backgroundThemeEnabled: false,
  backgroundOpacity: 100,
  backgroundBrightness: 100,
  fullDarkBackground: false,
  liquidDensity: 12,
  liquidTransparency: 45,
  liquidLens: 35,
  liquidClearness: 35,
  liquidGel: 55,
  bounceStiffness: 200,
  bounceDamping: 24,
};

const LEGACY_PERFORMANCE_KEY = 'mobile-liquid-glass-performance';
const STORAGE_PREFIX = 'mobile-liquid-glass-engine-v1';
const CLARITY_VALUES = ['default', 'smooth', 'medium', 'punchy'];
const GLASS_THEME_VALUES = ['type-1', 'type-2', 'type-3', 'type-4'];

const clamp = (value, min, max, fallback) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
};

const readStored = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : raw;
  } catch {
    return fallback;
  }
};

const writeStored = (key, value) => {
  try { localStorage.setItem(key, String(value)); } catch { /* local cache is best-effort */ }
};

const scopeKey = (userId, suffix) => `${STORAGE_PREFIX}:${userId || 'guest'}:${suffix}`;

const normalizeSettings = (raw = {}) => ({
  displayName: String(raw.displayName || '').trim().slice(0, 40),
  uiTextClarity: CLARITY_VALUES.includes(raw.uiTextClarity) ? raw.uiTextClarity : ENGINE_DEFAULTS.uiTextClarity,
  performance: raw.performance === 'ultra' ? 'ultra' : 'high',
  theme: raw.theme === 'dark' ? 'dark' : 'light',
  glassTheme: GLASS_THEME_VALUES.includes(raw.glassTheme) ? raw.glassTheme : ENGINE_DEFAULTS.glassTheme,
  pureBlack: Boolean(raw.pureBlack),
  backgroundThemeEnabled: Boolean(raw.backgroundThemeEnabled),
  backgroundOpacity: clamp(raw.backgroundOpacity, 0, 100, ENGINE_DEFAULTS.backgroundOpacity),
  backgroundBrightness: clamp(raw.backgroundBrightness, 0, 200, ENGINE_DEFAULTS.backgroundBrightness),
  fullDarkBackground: Boolean(raw.fullDarkBackground),
  liquidDensity: clamp(raw.liquidDensity, 0, 40, ENGINE_DEFAULTS.liquidDensity),
  liquidTransparency: clamp(raw.liquidTransparency, 0, 100, ENGINE_DEFAULTS.liquidTransparency),
  liquidLens: clamp(raw.liquidLens, 0, 100, ENGINE_DEFAULTS.liquidLens),
  liquidClearness: clamp(raw.liquidClearness, 0, 100, ENGINE_DEFAULTS.liquidClearness),
  liquidGel: clamp(raw.liquidGel, 0, 100, ENGINE_DEFAULTS.liquidGel),
  bounceStiffness: clamp(raw.bounceStiffness, 100, 500, ENGINE_DEFAULTS.bounceStiffness),
  bounceDamping: clamp(raw.bounceDamping, 10, 40, ENGINE_DEFAULTS.bounceDamping),
});

function readLocalSettings(scope) {
  return normalizeSettings({
    displayName: readStored(scopeKey(scope, 'display-name'), ENGINE_DEFAULTS.displayName),
    uiTextClarity: readStored(scopeKey(scope, 'ui-text-clarity'), ENGINE_DEFAULTS.uiTextClarity),
    performance: readStored(scopeKey(scope, 'performance'), readStored(LEGACY_PERFORMANCE_KEY, ENGINE_DEFAULTS.performance)),
    theme: readStored(scopeKey(scope, 'theme'), ENGINE_DEFAULTS.theme),
    glassTheme: readStored(scopeKey(scope, 'glass-theme'), ENGINE_DEFAULTS.glassTheme),
    pureBlack: readStored(scopeKey(scope, 'pure-black'), String(ENGINE_DEFAULTS.pureBlack)) === 'true',
    backgroundThemeEnabled: readStored(scopeKey(scope, 'background-theme'), String(ENGINE_DEFAULTS.backgroundThemeEnabled)) === 'true',
    backgroundOpacity: readStored(scopeKey(scope, 'background-opacity'), ENGINE_DEFAULTS.backgroundOpacity),
    backgroundBrightness: readStored(scopeKey(scope, 'background-brightness'), ENGINE_DEFAULTS.backgroundBrightness),
    fullDarkBackground: readStored(scopeKey(scope, 'full-dark-background'), String(ENGINE_DEFAULTS.fullDarkBackground)) === 'true',
    liquidDensity: readStored(scopeKey(scope, 'liquid-density'), ENGINE_DEFAULTS.liquidDensity),
    liquidTransparency: readStored(scopeKey(scope, 'liquid-transparency'), ENGINE_DEFAULTS.liquidTransparency),
    liquidLens: readStored(scopeKey(scope, 'liquid-lens'), ENGINE_DEFAULTS.liquidLens),
    liquidClearness: readStored(scopeKey(scope, 'liquid-clearness'), ENGINE_DEFAULTS.liquidClearness),
    liquidGel: readStored(scopeKey(scope, 'liquid-gel'), ENGINE_DEFAULTS.liquidGel),
    bounceStiffness: readStored(scopeKey(scope, 'bounce-stiffness'), ENGINE_DEFAULTS.bounceStiffness),
    bounceDamping: readStored(scopeKey(scope, 'bounce-damping'), ENGINE_DEFAULTS.bounceDamping),
  });
}

function cacheSettings(scope, settings) {
  const entries = [
    ['display-name', settings.displayName],
    ['ui-text-clarity', settings.uiTextClarity],
    ['performance', settings.performance],
    ['theme', settings.theme],
    ['glass-theme', settings.glassTheme],
    ['pure-black', settings.pureBlack],
    ['background-theme', settings.backgroundThemeEnabled],
    ['background-opacity', settings.backgroundOpacity],
    ['background-brightness', settings.backgroundBrightness],
    ['full-dark-background', settings.fullDarkBackground],
    ['liquid-density', settings.liquidDensity],
    ['liquid-transparency', settings.liquidTransparency],
    ['liquid-lens', settings.liquidLens],
    ['liquid-clearness', settings.liquidClearness],
    ['liquid-gel', settings.liquidGel],
    ['bounce-stiffness', settings.bounceStiffness],
    ['bounce-damping', settings.bounceDamping],
  ];
  entries.forEach(([suffix, value]) => writeStored(scopeKey(scope, suffix), value));
  writeStored(LEGACY_PERFORMANCE_KEY, settings.performance);
}

export default function useEngineSettings(userId) {
  const [settings, setSettings] = useState(ENGINE_DEFAULTS);
  const [hydratedUser, setHydratedUser] = useState(null);

  useEffect(() => {
    let active = true;
    const scope = userId || 'guest';
    const local = readLocalSettings(scope);
    setHydratedUser(null);
    setSettings(local);

    if (!userId || !supabase) {
      setHydratedUser(scope);
      return () => { active = false; };
    }

    supabase.from('profiles').select('engine_settings').eq('id', userId).maybeSingle().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        console.warn('Engine Settings cloud load failed; using local cache.', error);
        setHydratedUser(userId);
        return;
      }
      const raw = data?.engine_settings;
      const cloud = raw && typeof raw === 'object' && Object.keys(raw).length ? normalizeSettings(raw) : null;
      if (cloud) {
        setSettings(cloud);
        cacheSettings(userId, cloud);
      }
      setHydratedUser(userId);
    }).catch((error) => {
      if (!active) return;
      console.warn('Engine Settings cloud load failed; using local cache.', error);
      setHydratedUser(userId);
    });

    return () => { active = false; };
  }, [userId]);

  useEffect(() => {
    if (!hydratedUser) return;
    cacheSettings(hydratedUser, settings);
    if (hydratedUser === 'guest' || !supabase) return;
    const timer = setTimeout(() => {
      supabase.from('profiles').upsert({ id: hydratedUser, engine_settings: settings }, { onConflict: 'id' }).then(({ error }) => {
        if (error) console.warn('Engine Settings cloud save failed.', error);
      }).catch((error) => console.warn('Engine Settings cloud save failed.', error));
    }, 250);
    return () => clearTimeout(timer);
  }, [hydratedUser, settings]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.theme === 'dark');
    document.documentElement.style.colorScheme = settings.theme;
    document.documentElement.classList.toggle('pure-black', settings.pureBlack);
    document.documentElement.dataset.backgroundTheme = settings.backgroundThemeEnabled ? 'on' : 'off';
    document.documentElement.dataset.fullDarkBackground = settings.fullDarkBackground ? 'on' : 'off';
    document.documentElement.dataset.uiTextClarity = settings.uiTextClarity;
    document.documentElement.dataset.glassPerformance = settings.performance;
    document.documentElement.dataset.glassTheme = settings.glassTheme;

    const transparency = settings.liquidTransparency / 100;
    const lens = settings.liquidLens / 100;
    const density = settings.liquidDensity;
    const clearness = settings.liquidClearness / 100;
    const gel = settings.liquidGel / 100;
    const root = document.documentElement;
    root.style.setProperty('--liquid-density', `${density}px`);
    root.style.setProperty('--liquid-transparency', String(transparency));
    root.style.setProperty('--liquid-glass-alpha', String(transparency));
    root.style.setProperty('--liquid-glass-dark-alpha', String(transparency * 0.16));
    root.style.setProperty('--liquid-veil-alpha', String(transparency * 0.36));
    root.style.setProperty('--liquid-dark-veil-alpha', String(transparency <= 0.45 ? 0.0775 + 0.45 * transparency : 0.46 - 0.4 * transparency));
    root.style.setProperty('--liquid-lens', String(lens));
    root.style.setProperty('--liquid-clearness', String(clearness));
    root.style.setProperty('--liquid-gel', String(gel));
    root.style.setProperty('--liquid-bounce', String(settings.bounceStiffness));
    root.style.setProperty('--liquid-bounce-damping', String(settings.bounceDamping));
    root.style.setProperty('--background-opacity', String(settings.backgroundOpacity / 100));
    root.style.setProperty('--background-brightness', String(settings.backgroundBrightness / 100));
    root.style.setProperty('--liquid-motion-duration', `${Math.round(420 - (settings.bounceStiffness - 100) * 0.7)}ms`);

    const opacity = settings.backgroundOpacity / 100;
    if (settings.pureBlack) {
      document.body.style.background = '#000';
    } else if (settings.fullDarkBackground) {
      document.body.style.background = '#050507';
    } else if (settings.backgroundThemeEnabled) {
      document.body.style.background = settings.theme === 'dark'
        ? `radial-gradient(circle at 20% 0%, rgb(23 59 98 / ${opacity}) 0, transparent 45%), radial-gradient(circle at 100% 100%, rgb(44 22 93 / ${opacity}) 0, transparent 48%), #07111f`
        : `radial-gradient(circle at 20% 0%, rgb(110 197 255 / ${opacity}) 0, transparent 45%), radial-gradient(circle at 100% 100%, rgb(171 126 255 / ${opacity}) 0, transparent 48%), #eef4fb`;
    } else {
      document.body.style.background = settings.theme === 'dark' ? '#07111f' : '#eef4fb';
    }
    window.dispatchEvent(new CustomEvent('glass-settings-changed'));
  }, [settings]);

  useEffect(() => {
    const onPerformanceChange = (event) => setSettings((current) => ({ ...current, performance: event.detail === 'ultra' ? 'ultra' : 'high' }));
    window.addEventListener('glass-performance-changed', onPerformanceChange);
    return () => window.removeEventListener('glass-performance-changed', onPerformanceChange);
  }, []);

  const update = useCallback((key, value) => {
    setSettings((current) => {
      if (key === 'displayName') return { ...current, displayName: String(value).trim().slice(0, 40) };
      if (key === 'uiTextClarity') return { ...current, uiTextClarity: CLARITY_VALUES.includes(value) ? value : current.uiTextClarity };
      if (key === 'performance') return { ...current, performance: value === 'ultra' ? 'ultra' : 'high' };
      if (key === 'theme') return { ...current, theme: value === 'dark' ? 'dark' : 'light' };
      if (key === 'glassTheme') return { ...current, glassTheme: GLASS_THEME_VALUES.includes(value) ? value : current.glassTheme };
      if (key === 'pureBlack' || key === 'backgroundThemeEnabled' || key === 'fullDarkBackground') return { ...current, [key]: Boolean(value) };
      if (key === 'backgroundOpacity') return { ...current, backgroundOpacity: clamp(value, 0, 100, current.backgroundOpacity) };
      if (key === 'backgroundBrightness') return { ...current, backgroundBrightness: clamp(value, 0, 200, current.backgroundBrightness) };
      if (key === 'liquidDensity') return { ...current, liquidDensity: clamp(value, 0, 40, current.liquidDensity) };
      if (key === 'liquidTransparency') return { ...current, liquidTransparency: clamp(value, 0, 100, current.liquidTransparency) };
      if (key === 'liquidLens') return { ...current, liquidLens: clamp(value, 0, 100, current.liquidLens) };
      if (key === 'liquidClearness') return { ...current, liquidClearness: clamp(value, 0, 100, current.liquidClearness) };
      if (key === 'liquidGel') return { ...current, liquidGel: clamp(value, 0, 100, current.liquidGel) };
      if (key === 'bounceStiffness') return { ...current, bounceStiffness: clamp(value, 100, 500, current.bounceStiffness) };
      if (key === 'bounceDamping') return { ...current, bounceDamping: clamp(value, 10, 40, current.bounceDamping) };
      return current;
    });
  }, []);

  const reset = useCallback(() => setSettings(ENGINE_DEFAULTS), []);
  return useMemo(() => ({ settings, setSetting: update, reset }), [settings, update, reset]);
}
