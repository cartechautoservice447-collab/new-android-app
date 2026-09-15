import { useState } from 'react';
import { BookOpen, FileText, FolderOpen, History, Play, ArrowLeft } from 'lucide-react';
import CourseOverview from './CourseOverview.jsx';
import StudySession from './StudySession.jsx';
import './CourseWorkspace.css';

const ACCENT = {
  sky: '#72d7ff', violet: '#bd86ff', amber: '#ffd166', emerald: '#67e8b1', rose: '#ff88a8', cyan: '#65e6ff',
};

export default function CourseWorkspace({ course, onBack, onCourses, onCollections, onNotes }) {
  const [toolView, setToolView] = useState(null);
  const accent = ACCENT[course.color] || ACCENT.sky;
  const noteCount = course.collections.reduce((sum, collection) => sum + collection.notes.length, 0);
  const collections = course.collections.length;
  const progress = Math.min(100, Math.max(0, course.progress || 0));

  if (toolView === 'study') return <StudySession course={course} onBack={() => setToolView(null)} />;
  if (toolView === 'overview') return <CourseOverview course={course} onBack={() => setToolView(null)} />;

  const tools = [
    { title: 'Study Session', text: 'Start a focused study session for this course.', icon: <Play size={21} />, onClick: () => setToolView('study') },
    { title: 'Collections', text: 'Organize notes into focused study groups.', icon: <FolderOpen size={21} />, onClick: onCollections },
    { title: 'All Notes', text: 'Open every note stored in this course.', icon: <FileText size={21} />, onClick: onNotes },
    { title: 'Course Overview', text: 'See this course progress, notes and activity.', icon: <BookOpen size={21} />, onClick: () => setToolView('overview') },
  ];

  return (
    <main className="screen feature-screen course-workspace-screen">
      <section className="full-glass-panel course-workspace-panel">
        <header className="course-workspace-header">
          <button type="button" className="back-button" onClick={onBack} aria-label="Back to dashboard"><ArrowLeft size={19} /></button>
          <div className="course-workspace-title">
            <span className="eyebrow">Course workspace</span>
            <h1>{course.name}</h1>
          </div>
          <button type="button" className="course-mini-action" onClick={onCourses} aria-label="All courses"><History size={17} /></button>
        </header>

        <section className="course-workspace-hero glass-card" style={{ '--course-accent': accent }}>
          <span className="course-workspace-icon"><FolderOpen size={26} /></span>
          <div className="course-workspace-copy">
            <div className="course-workspace-title-row">
              <h2>{course.name}</h2>
              <span>{noteCount} {noteCount === 1 ? 'note' : 'notes'}</span>
            </div>
            <p>{course.description}</p>
            <span className="course-workspace-badge">{course.color}</span>
          </div>
        </section>

        <section className="course-workspace-progress glass-inner">
          <div className="course-workspace-progress-heading"><span>Progress</span><strong>{progress}%</strong></div>
          <div className="course-workspace-progress-track"><span style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${accent}, #bd86ff)` }} /></div>
          <div className="course-workspace-progress-meta"><span>{noteCount} {noteCount === 1 ? 'note' : 'notes'}</span><span>{collections} {collections === 1 ? 'collection' : 'collections'}</span></div>
        </section>

        <div className="course-workspace-section-heading">
          <div><span className="heading-dot" /><h2>Course tools</h2></div>
          <span>4 folders</span>
        </div>

        <section className="course-workspace-tools" aria-label="Course tools">
          {tools.map((tool, index) => <button type="button" key={tool.title} className="glass-card course-tool-folder" onClick={tool.onClick} style={{ '--course-accent': accent }}>
            <span className="course-tool-index">0{index + 1}</span>
            <span className="course-tool-icon">{tool.icon}</span>
            <span className="course-tool-copy"><strong>{tool.title}</strong><small>{tool.text}</small></span>
            <span className="course-tool-arrow">›</span>
          </button>)}
        </section>
      </section>
    </main>
  );
}
