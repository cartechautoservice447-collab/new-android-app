import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './workspaceHydrationRepair.js';
import './collectionTombstoneRepair.js';
import './collectionDeleteIntegration.js';
import App from './App.jsx';
import { configureNativeAuth } from './nativeAuth.js';
import { configureSharedNotifications } from './sharedNotifications.js';
import { supabase, getMobileWebAuthRedirect } from './lib/supabase.js';
import LiquidEnvironment from './LiquidEnvironment.jsx';
import LiquidRefractionFilter from './LiquidRefractionFilter.jsx';
import './styles.css';
import './LiquidGlassSurfaceOverrides.css';
import './LiquidGlassEngine.css';
import './LiquidGlassFinalOverrides.css';
import './DashboardResponsive.css';
import './AddCourseCompactResponsive.css';
import './CourseWorkspaceSpacing.css';
import './NotesEditorResponsive.css';
import './MobileNoteEditorFrame.css';
import './MobileNoteEditorChrome.css';
import './MobileNoteEditorHorizontalFit.css';
import './MobileNoteEditorViewportFix.css';
import './NoteEditorPremiumRefinement.css';
import './AndroidMobileHardening.css';
import './FeatureBackgroundUnification.css';
import './MobileNoteCodeBlockFix.css';
import './GlassSurfaceRuntimeLock.js';

function handleWebAuthCallback() {
  if (!supabase || typeof window === 'undefined') return;
  const callbackPath = window.location.pathname === '/auth/callback';
  const rootWithCode = window.location.pathname === '/' && window.location.search.includes('code=');
  if (!callbackPath && !rootWithCode) return;
  if (!window.location.search.includes('code=')) return;

  void (async () => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    if (!code) return;

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('Mobile OAuth callback failed:', error.message);
      return;
    }

    const destination = getMobileWebAuthRedirect().replace(/\/auth\/callback$/, '/');
    window.history.replaceState({}, document.title, destination);
    window.dispatchEvent(new CustomEvent('mobile-auth-callback-complete'));
  })();
}

void configureNativeAuth();
handleWebAuthCallback();
const disposeSharedNotifications = configureSharedNotifications();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <div className="app-root-layer">
      <LiquidEnvironment />
      <LiquidRefractionFilter />
      <App />
    </div>
  </StrictMode>,
);

if (import.meta.hot) {
  import.meta.hot.dispose(() => disposeSharedNotifications?.());
}
