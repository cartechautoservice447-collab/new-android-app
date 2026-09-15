import { useMemo, useState } from 'react';
import { ArrowLeft, FileText, Folder, FolderOpen, Home, History, LayoutGrid, MoreHorizontal, Plus, Search, X } from 'lucide-react';
import './CourseFolderResponsive.css';

const ACCENT = {
  sky: '#72d7ff', violet: '#bd86ff', amber: '#ffd166', emerald: '#67e8b1', rose: '#ff88a8', cyan: '#65e6ff',
};

export default function CourseFolderPage({ courses, onBack, onOpenCourse, onAddCourse, onHome, onCollections, onNotes }) {
  const [query, setQuery] = useState('');
  const [moreOpen, setMoreOpen] = useState(false);
  const [navView, setNavView] = useState('courses');

  const activeCourse = courses[0] || null;
  const filteredCourses = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return courses;
    return courses.filter((course) => `${course.name} ${course.description}`.toLowerCase().includes(normalized));
  }, [courses, query]);

  const courseCollections = activeCourse?.collections || [];
  const totalNotes = courseCollections.reduce((sum, collection) => sum + collection.notes.length, 0);

  const goHome = () => {
    setNavView('courses');
    onHome();
  };

  const openCourseView = () => setNavView('courses');
  const openCollectionsView = () => setNavView('collections');
  const openNotesView = () => setNavView('notes');

  return (
    <main className="screen feature-screen course-folder-screen">
      <section className="full-glass-panel course-folder-panel">
        {navView === 'courses' && (
          <>
            <header className="feature-header course-folder-header">
              <button type="button" className="back-button" onClick={onBack} aria-label="Back to dashboard"><ArrowLeft size={19} /></button>
              <div className="header-title">
                <span className="eyebrow">Course library</span>
                <h1>Course Folders</h1>
                <p>{courses.length} {courses.length === 1 ? 'course' : 'courses'} · {totalNotes} notes</p>
              </div>
              <button type="button" className="folder-add-button" onClick={onAddCourse} aria-label="Add new course"><Plus size={20} /></button>
            </header>

            <label className="course-search glass-inner">
              <Search size={17} aria-hidden="true" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search courses…" aria-label="Search courses" />
            </label>

            <div className="course-folder-list">
              {filteredCourses.map((course) => {
                const noteCount = course.collections.reduce((sum, collection) => sum + collection.notes.length, 0);
                const accent = ACCENT[course.color] || ACCENT.sky;
                return (
                  <button type="button" className="course-folder-card glass-card" key={course.id} onClick={() => onOpenCourse(course.id)}>
                    <span className="course-folder-icon" style={{ '--course-accent': accent }}><Folder size={22} /></span>
                    <span className="course-folder-copy">
                      <strong>{course.name}</strong>
                      <small>{course.description}</small>
                      <span className="course-folder-badge" style={{ '--course-accent': accent }}>{course.color}</span>
                    </span>
                    <span className="course-folder-note-count"><FileText size={12} />{noteCount} {noteCount === 1 ? 'note' : 'notes'}</span>
                    <span className="course-folder-arrow">›</span>
                  </button>
                );
              })}
              {!filteredCourses.length && <div className="empty-state glass-inner">No courses match “{query}”.</div>}
            </div>
          </>
        )}

        {navView === 'collections' && activeCourse && (
          <>
            <header className="feature-header centered-header course-subview-header">
              <button type="button" className="back-button" onClick={onBack} aria-label="Back to dashboard"><ArrowLeft size={19} /></button>
              <div className="header-title">
                <span className="eyebrow">{activeCourse.name}</span>
                <h1>Collections</h1>
              </div>
            </header>
            <div className="section-heading course-section-heading">
              <div><span className="heading-dot" /><h2>Course collections</h2></div>
              <span className="note-total">{courseCollections.length} total</span>
            </div>
            <div className="collections-list course-subview-list">
              {courseCollections.map((collection, index) => (
                <div className="glass-list-item" key={collection.id} role="group">
                  <span className="list-index">{String(index + 1).padStart(2, '0')}</span>
                  <span className="list-copy"><strong>{collection.title}</strong><span>{collection.description}</span></span>
                  <span className="collection-count">{collection.notes.length}</span>
                  <span className="list-arrow">›</span>
                </div>
              ))}
              {!courseCollections.length && <div className="empty-state glass-inner">No collections yet.</div>}
            </div>
          </>
        )}

        {navView === 'collections' && !activeCourse && <div className="empty-state glass-inner">No course is available.</div>}

        {navView === 'notes' && activeCourse && (
          <>
            <header className="feature-header centered-header course-subview-header all-notes-header">
              <button type="button" className="back-button" onClick={onBack} aria-label="Back to course"><History size={18} /></button>
              <div className="header-title">
                <span className="eyebrow">{activeCourse.name}</span>
                <h1>All Notes</h1>
              </div>
            </header>
            <div className="section-heading course-section-heading">
              <div><span className="heading-dot" /><h2>Course notes</h2></div>
              <span className="note-total">{totalNotes} total</span>
            </div>
            <div className="notes-list course-subview-list">
              {courseCollections.map((collection, index) => (
                <div className="glass-list-item" key={collection.id} role="group">
                  <span className="list-index">{String(index + 1).padStart(2, '0')}</span>
                  <span className="list-copy"><strong>{collection.title}</strong><span>{collection.notes.length} {collection.notes.length === 1 ? 'note' : 'notes'} · Open collection</span></span>
                  <span className="collection-count">{collection.notes.length}</span>
                  <span className="list-arrow">›</span>
                </div>
              ))}
              {!courseCollections.length && <div className="empty-state glass-inner">No notes yet.</div>}
            </div>
          </>
        )}

        {navView === 'notes' && !activeCourse && <div className="empty-state glass-inner">No course is available.</div>}

        <MobileCourseNav
          active={navView}
          onHome={goHome}
          onCourses={openCourseView}
          onCollections={openCollectionsView}
          onNotes={openNotesView}
          onMore={() => setMoreOpen(true)}
        />

        {moreOpen && (
          <div className="modal-backdrop" onClick={() => setMoreOpen(false)}>
            <section className="glass-modal course-more-menu" onClick={(event) => event.stopPropagation()}>
              <button type="button" className="modal-close" onClick={() => setMoreOpen(false)} aria-label="Close"><X size={18} /></button>
              <span className="modal-symbol"><MoreHorizontal size={21} /></span>
              <h2>Course library</h2>
              <p>Quick actions for your course library.</p>
              <div className="course-menu-actions">
                <button type="button" onClick={() => { setMoreOpen(false); onAddCourse(); }}><Plus size={16} /> Add a course</button>
                <button type="button" onClick={() => { setMoreOpen(false); goHome(); }}><Home size={16} /> Return home</button>
              </div>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}

function MobileCourseNav({ active, onHome, onCourses, onCollections, onNotes, onMore }) {
  const items = [
    ['home', 'Home', onHome, Home],
    ['courses', 'Courses', onCourses, LayoutGrid],
    ['collections', 'Collections', onCollections, FolderOpen],
    ['notes', 'Notes', onNotes, FileText],
    ['more', 'More', onMore, MoreHorizontal],
  ];

  return (
    <nav className="course-mobile-nav" aria-label="Course navigation">
      {items.map(([key, label, handler, Icon]) => (
        <button type="button" key={key} className={active === key ? 'nav-active' : ''} onClick={handler} aria-label={label} title={label}>
          <span className="course-mobile-nav-icon"><Icon size={21} strokeWidth={1.8} aria-hidden="true" /></span>
          <small>{label}</small>
        </button>
      ))}
    </nav>
  );
}
