import { motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { ArrowLeft, BookOpen, FileText, Folder, History, Moon, Plus, Settings2, Sparkles, Sun, Trash2, User, X, Zap } from 'lucide-react';
import { isSupabaseConfigured, supabase } from './lib/supabase.js';
import { DEFAULT_COURSE } from './courseDefaults.js';
import CourseWorkspace from './CourseWorkspace.jsx';
import CourseFolderPage from './CourseFolderPage.jsx';
import CollectionWorkspace from './CollectionWorkspace.jsx';
import EngineSettingsModal from './EngineSettingsModal.jsx';
import useEngineSettings from './useEngineSettings.js';
import { clearLocalWorkspaceDirtyFlag, deleteCloudCourse, deleteCloudNote, loadCloudWorkspace, readLocalWorkspace, saveCloudWorkspace, writeLocalWorkspace } from './cloudWorkspace.js';
import { repairWorkspaceBeforeHydration } from './workspaceHydrationRepair.js';
import { repairExistingCloudCollections } from './collectionTombstoneRepair.js';
import DailyPlannerPage from './DailyPlannerPage.jsx';

const ICON = '/icon.svg';
const SKIP_AUTH_KEY = 'mobile-liquid-glass-skip-auth';
const COURSE_ACCENTS = [
  { name: 'sky', value: '#72d7ff' }, { name: 'violet', value: '#bd86ff' }, { name: 'amber', value: '#ffd166' },
  { name: 'emerald', value: '#67e8b1' }, { name: 'rose', value: '#ff88a8' }, { name: 'cyan', value: '#65e6ff' },
];
const INITIAL_COURSES = [{
  id: DEFAULT_COURSE.id, name: DEFAULT_COURSE.title, description: DEFAULT_COURSE.subtitle, color: 'sky', progress: DEFAULT_COURSE.progress,
  collections: [
    { id: 'collection-1', title: 'Getting Started', description: 'Your first collection for organizing study notes.', notes: [
      { id: 'note-1', title: 'Welcome to your notes', content: 'Capture ideas, key points, and study material here.' },
      { id: 'note-2', title: 'Getting started', content: 'Your first note is ready. Open it when you want to begin.' },
    ]},
    { id: 'collection-2', title: 'Quick Thoughts', description: 'Keep important thoughts close while you study.', notes: [
      { id: 'note-3', title: 'Quick thoughts', content: 'Keep important thoughts close while you study.' },
    ]},
  ],
}];

export default function App() {
  const [session, setSession] = useState(null);
  const [skippedAuth, setSkippedAuth] = useState(() => localStorage.getItem(SKIP_AUTH_KEY) === 'true');
  const [page, setPage] = useState('workspace');
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState(null);
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [courses, setCourses] = useState(() => readLocalWorkspace() || INITIAL_COURSES);
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseDescription, setNewCourseDescription] = useState('');
  const [newCourseColor, setNewCourseColor] = useState('sky');
  const [courseCreateOpen, setCourseCreateOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newNoteName, setNewNoteName] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [action, setAction] = useState(null);
  const latestCoursesRef = useRef(courses);
  const workspaceMutationQueueRef = useRef(Promise.resolve());
  const currentUserIdRef = useRef(null);
  const hydrationGenerationRef = useRef(0);
  const hydratedUserIdRef = useRef(null);

  useEffect(() => { latestCoursesRef.current = courses; }, [courses]);

  useEffect(() => {
    if (!supabase) { setWorkspaceReady(true); setLoading(false); return undefined; }
    let active = true;

    const hydrate = async (nextSession) => {
      if (!active) return;
      const nextUserId = nextSession?.user?.id ? String(nextSession.user.id) : 'anonymous';
      const hydrationGeneration = ++hydrationGenerationRef.current;
      currentUserIdRef.current = nextUserId;
      setSession(nextSession);
      setWorkspaceReady(false);

      if (nextUserId !== hydratedUserIdRef.current) {
        hydratedUserIdRef.current = nextUserId;
      }

      if (nextUserId === 'anonymous') {
        const local = readLocalWorkspace('anonymous') || INITIAL_COURSES;
        latestCoursesRef.current = local;
        setCourses(local);
        setSelectedCourseId(null);
        setSelectedCollectionId(null);
        setSelectedNoteId(null);
        setPage('workspace');
        setWorkspaceReady(true);
        setLoading(false);
        return;
      }

      try {
        const cloud = await loadCloudWorkspace(nextUserId);
        if (!active || hydrationGeneration !== hydrationGenerationRef.current || currentUserIdRef.current !== nextUserId) return;
        if (cloud) {
          latestCoursesRef.current = cloud;
          setCourses(cloud);
        }
        setWorkspaceReady(true);
      } catch (error) {
        if (!active || hydrationGeneration !== hydrationGenerationRef.current || currentUserIdRef.current !== nextUserId) return;
        setWorkspaceReady(true);
        setMessage(`Workspace sync unavailable: ${error.message}`);
      } finally {
        if (active && hydrationGeneration === hydrationGenerationRef.current && currentUserIdRef.current === nextUserId) setLoading(false);
      }
    };

    const initialize = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        await hydrate(data.session);
        // Run workspace repairs after hydration completes — fire-and-forget so they
        // do not block the loading spinner from clearing. Each has isolated error
        // handling so a repair failure cannot affect startup.
        const repairUserId = data.session?.user?.id ? String(data.session.user.id) : null;
        if (repairUserId) {
          void repairWorkspaceBeforeHydration(repairUserId).catch((error) => {
            console.warn('Workspace hydration repair skipped:', error?.message || error);
          });
          void repairExistingCloudCollections(repairUserId).catch((error) => {
            console.warn('Collection tombstone repair skipped:', error?.message || error);
          });
        }
      } catch (error) {
        if (active) {
          setWorkspaceReady(true);
          setLoading(false);
          setMessage(`Authentication check failed: ${error.message}`);
        }
      }
    };

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'INITIAL_SESSION') return;
      const nextUserId = nextSession?.user?.id ? String(nextSession.user.id) : 'anonymous';
      if (event !== 'SIGNED_IN' && event !== 'SIGNED_OUT' && event !== 'USER_UPDATED' && nextUserId === currentUserIdRef.current) return;
      void hydrate(nextSession);
    });

    void initialize();
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;
    const register = async () => CapacitorApp.addListener('backButton', async () => {
      if (courseCreateOpen) { setCourseCreateOpen(false); return; }
      if (action) { setAction(null); return; }
      switch (page) {
        case 'editor': setSelectedNoteId(null); setPage('notes'); break;
        case 'notes': setPage('collections'); break;
        case 'collections': setPage('course-workspace'); break;
        case 'course-notes': setPage('course-workspace'); break;
        case 'course-workspace': setSelectedCollectionId(null); setSelectedNoteId(null); setPage('workspace'); break;
        case 'courses': setPage('workspace'); break;
        case 'daily-planner': setPage('workspace'); break;
        default: await CapacitorApp.exitApp();
      }
    });
    const registration = register();
    return () => { registration.then((handle) => handle.remove()); };
  }, [action, courseCreateOpen, page]);

  // Bridge for plain-JS scripts (dashboard-enhancer.js) that cannot import
  // ES modules. They dispatch 'mobile-glass-open-planner' to navigate here.
  useEffect(() => {
    const handler = () => setPage('daily-planner');
    window.addEventListener('mobile-glass-open-planner', handler, { passive: true });
    return () => window.removeEventListener('mobile-glass-open-planner', handler);
  }, []);

  const { settings, setSetting, reset: resetEngineSettings } = useEngineSettings(session?.user?.id || null);
  const performance = settings.performance;
  const setPerformanceMode = (mode) => setSetting('performance', mode);
  const selectedCourse = useMemo(() => courses.find((course) => course.id === selectedCourseId) || null, [courses, selectedCourseId]);
  const selectedCollection = useMemo(() => selectedCourse?.collections.find((collection) => collection.id === selectedCollectionId) || null, [selectedCourse, selectedCollectionId]);
  const selectedNote = useMemo(() => selectedCollection?.notes.find((item) => item.id === selectedNoteId) || null, [selectedCollection, selectedNoteId]);
  const totalNotes = courses.reduce((sum, course) => sum + course.collections.reduce((inner, collection) => inner + collection.notes.length, 0), 0);

  const persistWorkspace = async (nextCourses, userId) => {
    const expectedUserId = String(userId || 'anonymous');
    writeLocalWorkspace(nextCourses, expectedUserId);

    if (expectedUserId !== 'anonymous' && (!session?.user?.id || String(session.user.id) !== expectedUserId)) {
      throw new Error('Workspace session changed before the mutation could be committed.');
    }

    if (expectedUserId !== 'anonymous' && supabase) {
      try {
        const sync = await saveCloudWorkspace(expectedUserId, nextCourses);
        if (!sync?.synced) {
          throw sync?.error || new Error('Cloud workspace sync did not complete.');
        }
      } catch (error) {
        setMessage(`Cloud save failed: ${error.message}`);
        throw error;
      }
    }

    if (currentUserIdRef.current === expectedUserId) {
      latestCoursesRef.current = nextCourses;
      setCourses(nextCourses);
    }
  };

  const runWorkspaceMutation = (mutator) => {
    const mutationUserId = String(session?.user?.id || 'anonymous');
    const execute = workspaceMutationQueueRef.current.catch(() => {}).then(async () => {
      if (String(currentUserIdRef.current || 'anonymous') !== mutationUserId) {
        throw new Error('Workspace session changed before the queued mutation started.');
      }
      const current = latestCoursesRef.current;
      const nextCourses = mutator(current);
      await persistWorkspace(nextCourses, mutationUserId);
      return nextCourses;
    });
    workspaceMutationQueueRef.current = execute.catch(() => {});
    return execute;
  };

  const signIn = async (event) => {
    event.preventDefault(); if (!supabase) return; setBusy(true); setMessage('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setMessage(error ? error.message : 'Signed in successfully.');
    if (!error) { localStorage.removeItem(SKIP_AUTH_KEY); setSkippedAuth(false); setPage('workspace'); }
    setBusy(false);
  };
  const signUp = async () => { if (!supabase) return; setBusy(true); setMessage(''); const { error } = await supabase.auth.signUp({ email, password }); setMessage(error ? error.message : 'Account created. Check your email if confirmation is enabled.'); setBusy(false); };
  const signInWithGoogle = async () => { if (!supabase) return; setBusy(true); setMessage(''); const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { queryParams: { prompt: 'select_account' } } }); if (error) { setMessage(error.message); setBusy(false); } };
  const skipForNow = () => { localStorage.setItem(SKIP_AUTH_KEY, 'true'); setSkippedAuth(true); setWorkspaceReady(true); setPage('workspace'); };
  const returnToLogin = () => { localStorage.removeItem(SKIP_AUTH_KEY); setSkippedAuth(false); setMessage(''); setPage('workspace'); };

  const openCourse = (id) => { setSelectedCourseId(id); setSelectedCollectionId(null); setSelectedNoteId(null); setPage('course-workspace'); setMessage(''); };
  const openCourseFolders = () => { setPage('courses'); setMessage(''); };
  const openCollection = (id) => { setSelectedCollectionId(id); setSelectedNoteId(null); setPage('notes'); setMessage(''); };
  const openNote = (id) => { const note = selectedCollection?.notes.find((item) => item.id === id); setSelectedNoteId(id); setEditorContent(note?.content || ''); setPage('editor'); setMessage(''); };
  const openCourseNote = (collectionId, noteId) => { setSelectedCollectionId(collectionId); setSelectedNoteId(noteId); const collection = selectedCourse?.collections.find((item) => item.id === collectionId); const note = collection?.notes.find((item) => item.id === noteId); setEditorContent(note?.content || ''); setPage('editor'); setMessage(''); };
  const openCourseCreator = () => { setNewCourseName(''); setNewCourseDescription(''); setNewCourseColor('sky'); setMessage(''); setCourseCreateOpen(true); };
  const closeCourseCreator = () => { setCourseCreateOpen(false); setNewCourseName(''); setNewCourseDescription(''); setNewCourseColor('sky'); };

  const addCourse = async (event) => { event.preventDefault(); const name = newCourseName.trim(); if (!name) return; const description = newCourseDescription.trim() || 'New course workspace'; const nextCourse = { id: `course-${Date.now()}`, name, description, color: newCourseColor, progress: 0, collections: [] }; await runWorkspaceMutation((current) => [...current, nextCourse]); closeCourseCreator(); setMessage('Course created.'); setPage('workspace'); };
  const updateCourse = async (patch) => { if (!selectedCourseId) return; await runWorkspaceMutation((current) => current.map((course) => course.id === selectedCourseId ? { ...course, ...patch } : course)); setMessage('Course updated.'); };
  const deleteCourse = async (id) => { await runWorkspaceMutation((current) => current.filter((course) => course.id !== id)); if (session?.user?.id) await deleteCloudCourse(session.user.id, id); setSelectedCourseId(null); setPage('workspace'); setMessage('Course deleted.'); };
  const addCollection = async (event) => { event.preventDefault(); const title = newCollectionName.trim(); if (!title || !selectedCourseId) return; const now = Date.now(); const collection = { id: `collection-${now}-${Math.random().toString(36).slice(2, 8)}`, title, description: 'New collection', notes: [], createdAt: now, updatedAt: now }; await runWorkspaceMutation((current) => current.map((course) => course.id === selectedCourseId ? { ...course, collections: [...course.collections, collection], updatedAt: now } : course)); setNewCollectionName(''); setMessage('Collection created.'); };
  const addNote = async (event) => { event?.preventDefault(); if (!selectedCourseId || !selectedCollectionId) return; const noteId = `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; const now = Date.now(); const title = newNoteName.trim() || 'New Note'; await runWorkspaceMutation((current) => current.map((course) => course.id !== selectedCourseId ? course : { ...course, collections: course.collections.map((collection) => collection.id !== selectedCollectionId ? collection : { ...collection, notes: [...collection.notes, { id: noteId, title, content: '', createdAt: now, updatedAt: now }] }) })); setNewNoteName(''); setSelectedNoteId(noteId); setEditorContent(''); setPage('notes'); setMessage('New note created.'); };
  const saveNote = async () => { if (!selectedCourseId || !selectedCollectionId || !selectedNoteId) return; const content = editorContent; await runWorkspaceMutation((current) => current.map((course) => course.id !== selectedCourseId ? course : { ...course, collections: course.collections.map((collection) => collection.id !== selectedCollectionId ? collection : { ...collection, notes: collection.notes.map((note) => note.id === selectedNoteId ? { ...note, content, updatedAt: Date.now() } : note) }) })); setMessage('Note saved.'); };
  const saveCollectionNote = async (draft) => { if (!selectedCourseId || !selectedCollectionId || !draft?.id) return; await runWorkspaceMutation((current) => current.map((course) => course.id !== selectedCourseId ? course : { ...course, collections: course.collections.map((collection) => collection.id !== selectedCollectionId ? collection : { ...collection, notes: collection.notes.map((note) => note.id === draft.id ? { ...note, title: draft.title, content: draft.content, updatedAt: Date.now() } : note) }) })); setMessage('Note saved.'); };
  const deleteCollectionNote = async (noteId) => { const courseId = selectedCourseId; const collectionId = selectedCollectionId; await runWorkspaceMutation((current) => current.map((course) => course.id !== courseId ? course : { ...course, collections: course.collections.map((collection) => collection.id !== collectionId ? collection : { ...collection, notes: collection.notes.filter((note) => note.id !== noteId) }) })); if (session?.user?.id) await deleteCloudNote(session.user.id, noteId, courseId, collectionId); setSelectedNoteId(null); setMessage('Note deleted.'); };

  if (loading) return <main className="screen"><div className="glass-card loading-card">Loading your workspace…</div></main>;
  if (!session && !skippedAuth) return <AuthScreen email={email} password={password} setEmail={setEmail} setPassword={setPassword} busy={busy} message={message} signIn={signIn} signUp={signUp} signInWithGoogle={signInWithGoogle} skipForNow={skipForNow} />;
  if (page === 'courses') return <CourseFolderPage courses={courses} onBack={() => setPage('workspace')} onOpenCourse={openCourse} onAddCourse={openCourseCreator} onHome={() => setPage('workspace')} onCollections={() => courses[0]?.collections[0] && openCollection(courses[0].collections[0].id)} onNotes={() => courses[0] && (setSelectedCourseId(courses[0].id), setPage('course-notes'))} onMore={() => setAction('courses-more')} />;
  if (page === 'course-workspace' && selectedCourse) return <CourseWorkspace course={selectedCourse} onBack={() => setPage('workspace')} onCourses={openCourseFolders} onCollections={() => setPage('collections')} onNotes={() => setPage('course-notes')} onStudySession={() => setAction('study')} onOverview={() => setAction('overview')} />;
  if (page === 'editor' && selectedCourse && selectedCollection) return <EditorPage course={selectedCourse} collection={selectedCollection} note={selectedNote} content={editorContent} setContent={setEditorContent} onBack={async () => { await saveNote(); setPage('notes'); }} onSave={saveNote} message={message} />;
  if (page === 'notes' && selectedCourse && selectedCollection) return <CollectionWorkspace course={selectedCourse} collection={selectedCollection} newNoteName={newNoteName} setNewNoteName={setNewNoteName} addNote={addNote} onBack={() => setPage('collections')} onSaveNote={saveCollectionNote} onDeleteNote={deleteCollectionNote} message={message} />;
  if (page === 'course-notes' && selectedCourse) return <AllCourseNotesPage course={selectedCourse} onBack={() => setPage('course-workspace')} openCollection={openCollection} />;
  if (page === 'collections' && selectedCourse) return <CollectionsPage course={selectedCourse} newCollectionName={newCollectionName} setNewCollectionName={setNewCollectionName} addCollection={addCollection} onBack={() => setPage('course-workspace')} openCollection={openCollection} message={message} />;
  if (page === 'daily-planner') return <DailyPlannerPage session={session} onBack={() => setPage('workspace')} />;
  return <Dashboard courses={courses} totalNotes={totalNotes} performance={performance} setPerformanceMode={setPerformanceMode} settings={settings} setSetting={setSetting} resetEngineSettings={resetEngineSettings} openCourseCreator={openCourseCreator} openCourseFolders={openCourseFolders} openCourse={openCourse} deleteCourse={deleteCourse} updateCourse={updateCourse} action={action} setAction={setAction} message={message} courseCreateOpen={courseCreateOpen} closeCourseCreator={closeCourseCreator} newCourseName={newCourseName} newCourseDescription={newCourseDescription} newCourseColor={newCourseColor} setNewCourseName={setNewCourseName} setNewCourseDescription={setNewCourseDescription} setNewCourseColor={setNewCourseColor} addCourse={addCourse} onLogout={session ? () => supabase?.auth.signOut() : returnToLogin} />;
}

function AuthScreen({ email, password, setEmail, setPassword, busy, message, signIn, signUp, signInWithGoogle, skipForNow }) {
  return <main className="screen"><section className="glass-card auth-card"><div className="brand"><img className="app-icon" src={ICON} alt="Liquid Glass Studio" /><div><span className="eyebrow">Liquid Glass Studio</span><h1>Welcome back</h1></div></div><p className="subtitle">Sign in to your mobile workspace.</p>{!isSupabaseConfigured && <div className="notice">Supabase is not configured yet. Add your Vite public Supabase values to the environment before signing in.</div>}<form onSubmit={signIn}><label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></label><label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></label><button className="primary-button" disabled={busy || !supabase}>{busy ? 'Working…' : 'Sign in'}</button></form><button className="google-button" onClick={signInWithGoogle} disabled={busy || !supabase}>Continue with Google</button><button className="link-button" onClick={signUp} disabled={busy || !supabase}>Create an account</button><button className="link-button skip-button" onClick={skipForNow} disabled={busy}>Skip for now</button>{message && <p className="message">{message}</p>}</section></main>;
}

function Dashboard({ courses, totalNotes, performance, setPerformanceMode, settings, setSetting, resetEngineSettings, openCourseCreator, openCourseFolders, openCourse, deleteCourse, updateCourse, action, setAction, message, courseCreateOpen, closeCourseCreator, newCourseName, newCourseDescription, newCourseColor, setNewCourseName, setNewCourseDescription, setNewCourseColor, addCourse, onLogout }) {
  const greeting = settings.displayName ? `Welcome back, ${settings.displayName}!` : 'Welcome back!';
  return <main className="screen dashboard-screen"><section className="dashboard-shell"><header className="dashboard-header glass-card"><div className="dashboard-copy"><span className="eyebrow">Liquid Glass Studio</span><h1>{greeting}</h1><p>Select a course folder to access your workspace</p></div><div className="dashboard-controls"><div className="performance-control glass-inner"><Zap size={15} /><span>Performance</span><button className={performance === 'high' ? 'toggle-active' : ''} onClick={() => setPerformanceMode('high')}>High</button><button className={performance === 'ultra' ? 'toggle-active' : ''} onClick={() => setPerformanceMode('ultra')}>Ultra</button></div><button className="icon-button" onClick={() => setSetting('theme', settings.theme === 'light' ? 'dark' : 'light')} aria-label={settings.theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}>{settings.theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}</button><button className="icon-button" onClick={() => setAction('settings')} aria-label="Engine settings"><Settings2 size={18} /></button><button className="icon-button" onClick={onLogout} aria-label="Account"><User size={18} /></button></div></header><div className="quick-actions"><ActionCard settings={settings} icon={<BookOpen size={22} />} title="Study Hub" text="CS50 lectures" onClick={() => setAction('study')} /><ActionCard settings={settings} icon={<History size={22} />} title="Overview" text="All study tools and progress" onClick={() => setAction('overview')} /></div><div className="section-heading"><div><span className="heading-dot" /><h2>Course Folders</h2></div><button className="view-all-button" data-dashboard-courses type="button" onClick={openCourseFolders}>View All <span>→</span></button><span className="note-total">{totalNotes} total notes</span></div><button className="glass-card add-course-trigger" type="button" onClick={openCourseCreator}><span className="add-course-symbol"><Plus size={20} /></span><span><strong>Add New Course</strong><small>Create a course folder and customize its details.</small></span><span className="action-arrow">›</span></button><div className="course-grid">{courses.map((course) => <CourseDashboardCard key={course.id} course={course} settings={settings} onOpen={() => openCourse(course.id)} onDelete={() => deleteCourse(course.id)} onUpdate={updateCourse} />)}</div>{message && <p className="message">{message}</p>}{action === 'settings' && <EngineSettingsModal settings={settings} setSetting={setSetting} reset={resetEngineSettings} close={() => setAction(null)} />}{action && action !== 'settings' && <ActionModal action={action} close={() => setAction(null)} />}{courseCreateOpen && <CourseCreateModal close={closeCourseCreator} name={newCourseName} description={newCourseDescription} color={newCourseColor} setName={setNewCourseName} setDescription={setNewCourseDescription} setColor={setNewCourseColor} submit={addCourse} />}</section></main>;
}
function ActionCard({ settings, icon, title, text, onClick }) { const gel = settings.liquidGel / 100; const spring = { type: 'spring', stiffness: settings.bounceStiffness, damping: settings.bounceDamping, mass: 0.6 + gel / 140 }; return <motion.button className="glass-card action-card" onClick={onClick} whileHover={{ scale: 1.025, y: -4 }} whileTap={{ scale: 0.96 }} transition={spring}><span className="action-icon">{icon}</span><span><strong>{title}</strong><small>{text}</small></span><span className="action-arrow">›</span></motion.button>; }
function CourseDashboardCard({ settings, course, onOpen, onDelete, onUpdate }) { const noteCount = course.collections.reduce((sum, collection) => sum + collection.notes.length, 0); const accent = COURSE_ACCENTS.find((item) => item.name === course.color)?.value || COURSE_ACCENTS[0].value; const gel = settings.liquidGel / 100; const spring = { type: 'spring', stiffness: settings.bounceStiffness, damping: settings.bounceDamping, mass: 0.6 + gel / 140 }; return <motion.article className="glass-card course-dashboard-card" style={{ '--course-accent': accent }} whileHover={{ scale: 1.03, y: -6 }} whileTap={{ scale: 0.97 }} transition={spring}><button className="course-open" onClick={onOpen}><div className="course-top"><span className="folder-icon"><Folder size={20} /></span><span className="note-pill"><FileText size={12} />{noteCount} {noteCount === 1 ? 'note' : 'notes'}</span></div><div className="course-copy"><h3>{course.name}</h3><span className="course-color">{course.color}</span><p>{course.description}</p></div><div className="course-footer"><span>{course.progress ? `${course.progress}% complete` : 'No notes yet'}</span><span>Open course ›</span></div></button><button className="delete-course" onClick={(event) => { event.stopPropagation(); if (window.confirm(`Delete ${course.name}?`)) onDelete(); }} aria-label={`Delete ${course.name}`}><Trash2 size={15} /></button></motion.article>; }
function CourseCreateModal({ close, name, description, color, setName, setDescription, setColor, submit }) {
  return <div className="modal-backdrop course-create-backdrop" onClick={close}><section className="glass-modal course-create-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={close} aria-label="Close"><X size={21} /></button><h2>Add New Course</h2><p>Create a new course and start organizing your notes</p><form onSubmit={submit} className="course-create-form"><label><span>Course Name</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Computer Science" autoFocus required /></label><label className="course-description-field"><span>Description (optional)</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Brief description of your course..." rows={3} maxLength={200} /><small className="description-count">{description.length}/200</small></label><div className="course-form-row"><span className="course-form-label">Accent Color</span><div className="accent-options">{COURSE_ACCENTS.map((accent) => <button key={accent.name} type="button" aria-label={accent.name} onClick={() => setColor(accent.name)} className={`accent-swatch ${color === accent.name ? 'accent-selected' : ''}`} style={{ '--accent-value': accent.value }}><span className="accent-swatch-orb" /><span className="accent-swatch-name">{accent.name[0].toUpperCase() + accent.name.slice(1)}</span></button>)}</div></div><div className="course-form-actions"><button type="submit" className="primary-button create-course-submit">Create Course <span aria-hidden="true">→</span></button></div></form></section></div>;
}
function ActionModal({ action, close }) { const details = { study: ['Study Hub', 'CS50 lectures and study workspace will open here.'], overview: ['Overview', 'Your study tools, progress and activity overview will appear here.'], theme: ['Theme', 'Liquid Glass appearance controls are available from Engine Settings.'], settings: ['Engine Settings', 'Liquid density, gel, bounce and display controls are available here.'], 'course-more': ['Course actions', 'Use Edit or Delete from the course header to manage this course.'], 'courses-more': ['Course library', 'Select a course to open its details and manage notes or collections.'] }[action]; return <div className="modal-backdrop" onClick={close}><section className="glass-modal" onClick={(e) => e.stopPropagation()}><button className="modal-close" onClick={close} aria-label="Close"><X size={18} /></button><span className="modal-symbol"><Sparkles size={22} /></span><h2>{details[0]}</h2><p>{details[1]}</p><button className="primary-button" onClick={close}>Close</button></section></div>; }
function CollectionsPage({ course, newCollectionName, setNewCollectionName, addCollection, onBack, openCollection, message }) { return <main className="screen feature-screen"><section className="full-glass-panel"><header className="feature-header centered-header"><button className="back-button" onClick={onBack} aria-label="Back">‹</button><div className="header-title"><span className="eyebrow">{course.name}</span><h1>Collections</h1></div></header><form className="top-action-form collection-create-form-inline" onSubmit={addCollection}><input value={newCollectionName} onChange={(e) => setNewCollectionName(e.target.value)} placeholder="Collection name" aria-label="Collection name" /><button className="collection-add-button" type="submit" aria-label="Create collection"><Plus size={18} /></button></form><div className="collections-list">{course.collections.map((collection, index) => <button className="glass-list-item" key={collection.id} onClick={() => openCollection(collection.id)}><span className="list-index">{String(index + 1).padStart(2, '0')}</span><span className="list-copy"><strong>{collection.title}</strong><span>{collection.description}</span></span><span className="collection-count">{collection.notes.length} notes</span><span className="list-arrow">›</span></button>)}</div>{message && <p className="message">{message}</p>}</section></main>; }
