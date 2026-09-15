import { useEffect } from 'react';
import { Moon, RotateCcw, Settings2, Sun, Zap } from 'lucide-react';

const CLARITY_OPTIONS = [
  ['default', 'Default'],
  ['smooth', 'Smooth'],
  ['medium', 'Medium'],
  ['punchy', 'Punchy'],
];

const GLASS_THEME_OPTIONS = [
  ['type-1', 'Type 1', 'Dashboard glass'],
  ['type-2', 'Type 2', 'Course card glass'],
  ['type-3', 'Type 3', 'Progress box glass'],
  ['type-4', 'Type 4', 'Saved notes glass'],
];

function Slider({ label, value, min, max, step = 1, display, onChange }) {
  return (
    <label className="engine-slider">
      <span className="engine-setting-line">
        <span>{label}</span>
        <strong>{display ?? value}</strong>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} aria-label={label} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function ToggleRow({ label, description, checked, onChange }) {
  return (
    <label className="engine-toggle-row">
      <span><strong>{label}</strong>{description && <small>{description}</small>}</span>
      <input type="checkbox" checked={checked} aria-label={label} onChange={(event) => onChange(event.target.checked)} />
      <span className="engine-switch" aria-hidden="true"><span /></span>
    </label>
  );
}

export default function EngineSettingsModal({ settings, setSetting, reset, close }) {
  useEffect(() => {
    const onKeyDown = (event) => { if (event.key === 'Escape') close(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [close]);

  return (
    <div className="modal-backdrop engine-settings-backdrop" onClick={close}>
      <section className="engine-settings-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="engine-settings-title">
        <header className="engine-settings-header">
          <div className="engine-settings-title-wrap">
            <span className="engine-settings-icon"><Settings2 size={20} /></span>
            <div><span className="eyebrow">Liquid Glass Engine</span><h2 id="engine-settings-title">Engine Settings</h2><p>Tune the glass, motion, background and text treatment. Changes are live and remembered.</p></div>
          </div>
          <button type="button" className="modal-close" onClick={close} aria-label="Close settings">×</button>
        </header>

        <div className="engine-settings-scroll">
          <section className="engine-settings-section engine-settings-performance-section">
            <div className="engine-section-heading"><span>Performance</span><small>Choose a lighter High mode or richer Ultra glass effects.</small></div>
            <div className="engine-performance-switch engine-performance-switch-prominent" role="group" aria-label="Performance mode">
              <button type="button" className={settings.performance === 'high' ? 'active' : ''} onClick={() => setSetting('performance', 'high')} aria-pressed={settings.performance === 'high'}><Zap size={13} /> High</button>
              <button type="button" className={settings.performance === 'ultra' ? 'active' : ''} onClick={() => setSetting('performance', 'ultra')} aria-pressed={settings.performance === 'ultra'}><Zap size={13} /> Ultra</button>
            </div>
          </section>

          <section className="engine-settings-section"><div className="engine-section-heading"><span>Profile</span><small>Your display name is limited to 40 characters.</small></div><label className="engine-field"><span>Display name</span><input value={settings.displayName} maxLength={40} placeholder="Your name" onChange={(event) => setSetting('displayName', event.target.value)} /></label></section>

          <section className="engine-settings-section">
            <div className="engine-section-heading"><span>Rendering</span><small>Separate text clarity from glass physics.</small></div>
            <div className="engine-chip-grid" aria-label="UI text clarity">{CLARITY_OPTIONS.map(([value, label]) => <button key={value} type="button" className={settings.uiTextClarity === value ? 'engine-chip active' : 'engine-chip'} aria-pressed={settings.uiTextClarity === value} onClick={() => setSetting('uiTextClarity', value)}>{label}</button>)}</div>
          </section>

          <section className="engine-settings-section">
            <div className="engine-section-heading"><span>Glass theme</span><small>Apply one of the four existing glass languages across the website.</small></div>
            <div className="engine-glass-theme-grid" aria-label="Global glass theme">{GLASS_THEME_OPTIONS.map(([value, label, description]) => <button key={value} type="button" className={settings.glassTheme === value ? 'engine-glass-theme active' : 'engine-glass-theme'} aria-pressed={settings.glassTheme === value} onClick={() => setSetting('glassTheme', value)}><span className="engine-glass-theme-sample" data-glass-preview={value} aria-hidden="true" /><span className="engine-glass-theme-copy"><strong>{label}</strong><small>{description}</small></span></button>)}</div>
          </section>

          <section className="engine-settings-section">
            <div className="engine-section-heading"><span>Appearance</span><small>Theme and background stage controls.</small></div>
            <div className="engine-theme-pair"><button type="button" className={settings.theme === 'light' ? 'active' : ''} onClick={() => setSetting('theme', 'light')} aria-pressed={settings.theme === 'light'}><Sun size={15} /> Day</button><button type="button" className={settings.theme === 'dark' ? 'active' : ''} onClick={() => setSetting('theme', 'dark')} aria-pressed={settings.theme === 'dark'}><Moon size={15} /> Night</button></div>
            <ToggleRow label="Pure black" description="Force a flat black canvas behind the glass." checked={settings.pureBlack} onChange={(value) => setSetting('pureBlack', value)} />
            <ToggleRow label="Background theme" description="Show the blue/violet stage layer and allow its opacity and brightness to be tuned." checked={settings.backgroundThemeEnabled} onChange={(value) => setSetting('backgroundThemeEnabled', value)} />
            {settings.backgroundThemeEnabled && <><Slider label="Background opacity" value={settings.backgroundOpacity} min={0} max={100} display={`${settings.backgroundOpacity}%`} onChange={(value) => setSetting('backgroundOpacity', value)} /><Slider label="Background brightness" value={settings.backgroundBrightness} min={0} max={200} display={`${settings.backgroundBrightness}%`} onChange={(value) => setSetting('backgroundBrightness', value)} /></>}
            <ToggleRow label="Fully dark theme" description="Use a uniform deep-dark stage and hide the ambient color orbs." checked={settings.fullDarkBackground} onChange={(value) => setSetting('fullDarkBackground', value)} />
          </section>

          <section className="engine-settings-section"><div className="engine-section-heading"><span>Optics</span><small>Control how light passes through the glass and how strongly the lens bends the scene.</small></div><Slider label="Liquid density" value={settings.liquidDensity} min={0} max={40} display={`${settings.liquidDensity}px`} onChange={(value) => setSetting('liquidDensity', value)} /><Slider label="Liquid transparency" value={settings.liquidTransparency} min={0} max={100} display={`${settings.liquidTransparency}%`} onChange={(value) => setSetting('liquidTransparency', value)} /><Slider label="Glass lens" value={settings.liquidLens} min={0} max={100} display={`${settings.liquidLens}%`} onChange={(value) => setSetting('liquidLens', value)} /><Slider label="Liquid clearness" value={settings.liquidClearness} min={0} max={100} display={`${settings.liquidClearness} idx`} onChange={(value) => setSetting('liquidClearness', value)} /><Slider label="Liquid gel" value={settings.liquidGel} min={0} max={100} display={`${settings.liquidGel}%`} onChange={(value) => setSetting('liquidGel', value)} /></section>

          <section className="engine-settings-section"><div className="engine-section-heading"><span>Motion</span><small>Control the spring response used by interactive glass movement.</small></div><Slider label="Bounce stiffness" value={settings.bounceStiffness} min={100} max={500} step={5} display={settings.bounceStiffness} onChange={(value) => setSetting('bounceStiffness', value)} /><Slider label="Bounce damping" value={settings.bounceDamping} min={10} max={40} display={settings.bounceDamping} onChange={(value) => setSetting('bounceDamping', value)} /></section>
        </div>

        <footer className="engine-settings-footer"><button type="button" className="engine-reset-button" onClick={reset}><RotateCcw size={15} /> Reset defaults</button><button type="button" className="primary-button engine-done-button" onClick={close}>Done</button></footer>
      </section>
    </div>
  );
}
