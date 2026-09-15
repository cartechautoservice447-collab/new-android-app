import { ArrowLeft, BookOpen, CheckCircle2, Clock3, FileText, Flame, FolderOpen, Layers3, Sparkles, Target, TrendingUp } from 'lucide-react';
import './CourseOverview.css';

const ACCENT = {
  sky: '#72d7ff', violet: '#bd86ff', amber: '#ffd166', emerald: '#67e8b1', rose: '#ff88a8', cyan: '#65e6ff',
};

function getCourseStats(course) {
  const collections = course.collections || [];
  const notes = collections.flatMap((collection) => collection.notes || []);
  const progress = Math.min(100, Math.max(0, Number(course.progress) || 0));
  const contentCoverage = Math.min(100, collections.length ? Math.round((collections.filter((collection) => (collection.notes || []).length > 0).length / collections.length) * 100) : 0);
  const completed = Math.round(progress / 20);
  return { collections, notes, progress, contentCoverage, completed };
}

export default function CourseOverview({ course, onBack }) {
  const accent = ACCENT[course.color] || ACCENT.sky;
  const { collections, notes, progress, contentCoverage, completed } = getCourseStats(course);
  const populatedCollections = collections.filter((collection) => (collection.notes || []).length > 0).length;
  const averageNotes = collections.length ? (notes.length / collections.length).toFixed(1) : '0.0';
  const health = progress >= 75 ? 'Excellent' : progress >= 45 ? 'On track' : progress > 0 ? 'Building' : 'Ready to start';

  return (
    <main className="screen feature-screen course-overview-screen">
      <section className="course-overview-panel">
        <header className="premium-feature-header">
          <button type="button" className="premium-back-button" onClick={onBack} aria-label="Back to course workspace"><ArrowLeft size={19} /></button>
          <div className="premium-feature-heading"><span>Course intelligence</span><h1>Course Overview</h1></div>
          <span className="premium-header-mark"><Sparkles size={17} /></span>
        </header>

        <section className="overview-hero glass-card" style={{ '--overview-accent': accent }}>
          <div className="overview-hero-top"><div><span className="overview-kicker">ACTIVE COURSE</span><h2>{course.name}</h2><p>{course.description}</p></div><span className="overview-score"><strong>{progress}%</strong><small>progress</small></span></div>
          <div className="overview-progress-track"><span style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${accent}, #bd86ff)` }} /></div>
          <div className="overview-progress-meta"><span><TrendingUp size={13} /> {health}</span><span>{completed}/5 milestones</span></div>
        </section>

        <section className="overview-stats" aria-label="Course statistics">
          <article className="overview-stat glass-inner"><span><FileText size={15} /></span><strong>{notes.length}</strong><small>Total notes</small></article>
          <article className="overview-stat glass-inner"><span><Layers3 size={15} /></span><strong>{collections.length}</strong><small>Collections</small></article>
          <article className="overview-stat glass-inner"><span><Target size={15} /></span><strong>{contentCoverage}%</strong><small>Coverage</small></article>
          <article className="overview-stat glass-inner"><span><Clock3 size={15} /></span><strong>{averageNotes}</strong><small>Notes / folder</small></article>
        </section>

        <section className="overview-grid">
          <article className="overview-card glass-card">
            <div className="overview-card-heading"><div><span className="overview-card-icon"><Target size={16} /></span><div><span className="overview-label">Roadmap</span><h3>Milestones</h3></div></div><span className="overview-chip">{completed} of 5</span></div>
            <div className="milestone-list">
              {[['Foundation', progress >= 20], ['Core notes', progress >= 40], ['Deep review', progress >= 60], ['Practice', progress >= 80], ['Mastery', progress >= 100]].map(([label, done]) => <div className={`milestone-row${done ? ' is-done' : ''}`} key={label}><span className="milestone-dot">{done ? <CheckCircle2 size={14} /> : null}</span><span>{label}</span><small>{done ? 'Complete' : 'Next'}</small></div>)}
            </div>
          </article>

          <article className="overview-card glass-card">
            <div className="overview-card-heading"><div><span className="overview-card-icon"><FolderOpen size={16} /></span><div><span className="overview-label">Structure</span><h3>Course health</h3></div></div><span className="overview-chip">{populatedCollections}/{collections.length}</span></div>
            <div className="health-meter"><div className="health-meter-copy"><strong>{health}</strong><span>{populatedCollections} active collections</span></div><div className="health-track"><span style={{ width: `${contentCoverage}%` }} /></div></div>
            <div className="health-points"><span><BookOpen size={13} /> Organized</span><span><FileText size={13} /> Indexed</span><span><Flame size={13} /> Focus-ready</span></div>
          </article>
        </section>

        <section className="overview-card glass-card recent-overview-card">
          <div className="overview-card-heading"><div><span className="overview-card-icon"><Sparkles size={16} /></span><div><span className="overview-label">Activity signal</span><h3>Course insights</h3></div></div><span className="overview-chip">Live</span></div>
          <div className="insight-grid">
            <div><strong>{notes.length === 0 ? 'Start your first note' : `${notes.length} notes captured`}</strong><span>{notes.length === 0 ? 'Create a collection and begin building your knowledge base.' : 'Your course already has a useful knowledge base to review.'}</span></div>
            <div><strong>{progress === 0 ? 'First milestone is waiting' : `${100 - progress}% remaining`}</strong><span>{progress >= 80 ? 'You are close to completion. Prioritize review and mastery.' : 'Use Study Session to turn the next milestone into focused progress.'}</span></div>
          </div>
        </section>
      </section>
    </main>
  );
}
