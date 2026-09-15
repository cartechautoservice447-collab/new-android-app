import { ArrowLeft, Check, Clock3, Coffee, Flame, Pause, Play, RotateCcw, Sparkles, TimerReset, Zap } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import PomodoroPanel from './components/focus/PomodoroPanel.jsx';
import './StudySession.css';

const ACCENT = {
  sky: '#72d7ff', violet: '#bd86ff', amber: '#ffd166', emerald: '#67e8b1', rose: '#ff88a8', cyan: '#65e6ff',
};
const DURATIONS = { focus: 25 * 60, deep: 50 * 60, sprint: 15 * 60 };

const STUDY_PLANS = {
  deep: {
    label: 'Deep Study',
    description: 'Long focused blocks for coding, difficult problems, and uninterrupted learning.',
    focus: 50,
    rest: 10,
    cycle: 60,
    accent: '#72d7ff',
  },
  balanced: {
    label: 'Balanced Study',
    description: 'Shorter focus blocks with a consistent recovery rhythm between sessions.',
    focus: 20,
    rest: 10,
    cycle: 30,
    accent: '#bd86ff',
  },
  classic: {
    label: 'Classic Study',
    description: 'A familiar study rhythm using focused 25-minute blocks and short rests.',
    focus: 25,
    rest: 10,
    cycle: 35,
    accent: '#67e8b1',
  },
};

function buildPlan(type, totalHours) {
  const plan = STUDY_PLANS[type];
  const targetMinutes = Math.max(60, Math.min(300, Math.round(totalHours * 60)));
  const blocks = [];
  let coreElapsed = 0;
  let elapsed = 0;
  let focusMinutes = 0;
  let restMinutes = 0;
  let sequence = 0;

  while (elapsed + plan.cycle <= targetMinutes) {
    sequence += 1;
    blocks.push({ id: `${type}-focus-${sequence}`, kind: 'focus', label: 'Focus', minutes: plan.focus, sequence, setNumber: 1 });
    blocks.push({ id: `${type}-rest-${sequence}`, kind: 'rest', label: 'Rest', minutes: plan.rest, sequence, setNumber: 1 });
    focusMinutes += plan.focus;
    restMinutes += plan.rest;
    elapsed += plan.cycle;
    coreElapsed = elapsed;
  }

  if (!blocks.length) {
    blocks.push({ id: `${type}-focus-1`, kind: 'focus', label: 'Focus', minutes: plan.focus, sequence: 1, setNumber: 1 });
    blocks.push({ id: `${type}-rest-1`, kind: 'rest', label: 'Rest', minutes: plan.rest, sequence: 1, setNumber: 1 });
    focusMinutes = plan.focus;
    restMinutes = plan.rest;
    coreElapsed = plan.cycle;
    elapsed = plan.cycle;
  }

  const cycles = blocks.filter((block) => block.kind === 'focus').length;
  const leftoverMinutes = Math.max(0, targetMinutes - coreElapsed);

  return {
    blocks,
    targetMinutes,
    elapsedMinutes: elapsed,
    leftoverMinutes,
    focusMinutes,
    restMinutes,
    cycles,
    plan,
  };
}

export default function StudySession({ course, onBack }) {
  const accent = ACCENT[course.color] || ACCENT.sky;
  const [mode, setMode] = useState('focus');
  const [remaining, setRemaining] = useState(DURATIONS.focus);
  const [running, setRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [goal, setGoal] = useState('Review course notes');
  const [finished, setFinished] = useState(false);
  const [studyPlanMode, setStudyPlanMode] = useState('deep');
  const [studyHours, setStudyHours] = useState(2);
  const [selectedPlanBlock, setSelectedPlanBlock] = useState(0);
  const deadlineRef = useRef(null);
  const remainingRef = useRef(DURATIONS.focus);
  const runStartedAtRef = useRef(null);
  const accumulatedSessionSecondsRef = useRef(0);

  useEffect(() => {
    remainingRef.current = remaining;
  }, [remaining]);

  useEffect(() => {
    if (!running) return undefined;
    let frame = 0;

    const tick = () => {
      const now = performance.now();
      const deadline = deadlineRef.current;
      const startedAt = runStartedAtRef.current;
      if (deadline == null || startedAt == null) return;

      const next = Math.max(0, (deadline - now) / 1000);
      const activeElapsed = Math.max(0, (now - startedAt) / 1000);
      remainingRef.current = next;
      setRemaining(next);
      setSessionSeconds(accumulatedSessionSecondsRef.current + activeElapsed);

      if (next <= 0) {
        accumulatedSessionSecondsRef.current += activeElapsed;
        setSessionSeconds(accumulatedSessionSecondsRef.current);
        deadlineRef.current = null;
        runStartedAtRef.current = null;
        remainingRef.current = 0;
        setRemaining(0);
        setRunning(false);
        setCompletedSessions((count) => count + 1);
        setFinished(true);
        return;
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running]);

  const duration = DURATIONS[mode];
  const progress = Math.min(100, Math.max(0, ((duration - remaining) / duration) * 100));
  const minutes = Math.floor(Math.max(0, remaining) / 60).toString().padStart(2, '0');
  const seconds = (Math.max(0, remaining) % 60).toString().padStart(2, '0');
  const sessionMinutes = Math.floor(sessionSeconds / 60);
  const plan = useMemo(() => buildPlan(studyPlanMode, studyHours), [studyPlanMode, studyHours]);
  const activePlanBlock = plan.blocks[Math.min(selectedPlanBlock, Math.max(0, plan.blocks.length - 1))];

  useEffect(() => {
    setSelectedPlanBlock(0);
  }, [studyPlanMode, studyHours]);

  const setSessionMode = (nextMode) => {
    const nextDuration = DURATIONS[nextMode];
    deadlineRef.current = null;
    runStartedAtRef.current = null;
    remainingRef.current = nextDuration;
    accumulatedSessionSecondsRef.current = 0;
    setMode(nextMode);
    setRemaining(nextDuration);
    setSessionSeconds(0);
    setRunning(false);
    setFinished(false);
  };

  const reset = () => {
    deadlineRef.current = null;
    runStartedAtRef.current = null;
    remainingRef.current = duration;
    accumulatedSessionSecondsRef.current = 0;
    setRemaining(duration);
    setSessionSeconds(0);
    setRunning(false);
    setFinished(false);
  };

  const toggleRunning = () => {
    const now = performance.now();
    if (running) {
      const startedAt = runStartedAtRef.current;
      if (startedAt != null) {
        accumulatedSessionSecondsRef.current += Math.max(0, (now - startedAt) / 1000);
      }
      const deadline = deadlineRef.current;
      const next = deadline == null ? remainingRef.current : Math.max(0, (deadline - now) / 1000);
      deadlineRef.current = null;
      runStartedAtRef.current = null;
      remainingRef.current = next;
      setRemaining(next);
      setSessionSeconds(accumulatedSessionSecondsRef.current);
      setRunning(false);
      return;
    }

    const next = Math.max(0, remainingRef.current);
    if (next <= 0) {
      remainingRef.current = duration;
      accumulatedSessionSecondsRef.current = 0;
      setRemaining(duration);
      setSessionSeconds(0);
      setFinished(false);
    }

    const durationToRun = next <= 0 ? duration : next;
    deadlineRef.current = now + durationToRun * 1000;
    runStartedAtRef.current = now;
    setRunning(true);
    setFinished(false);
  };

  const completeNow = () => {
    const now = performance.now();
    if (running && runStartedAtRef.current != null) {
      accumulatedSessionSecondsRef.current += Math.max(0, (now - runStartedAtRef.current) / 1000);
      setSessionSeconds(accumulatedSessionSecondsRef.current);
    }
    deadlineRef.current = null;
    runStartedAtRef.current = null;
    remainingRef.current = 0;
    setRemaining(0);
    setRunning(false);
    setCompletedSessions((count) => count + 1);
    setFinished(true);
  };

  const handleHoursInput = (value) => {
    const next = Number(value);
    if (!Number.isFinite(next)) return;
    setStudyHours(Math.min(5, Math.max(1, Math.round(next * 4) / 4)));
  };

  const status = useMemo(() => finished ? 'Session complete' : running ? 'Deep focus active' : remaining >= duration ? 'Ready when you are' : 'Session paused', [finished, running, remaining, duration]);

  return (
    <main className="screen feature-screen study-session-screen">
      <section className="study-session-panel">
        <header className="premium-feature-header">
          <button type="button" className="premium-back-button" onClick={onBack} aria-label="Back to course workspace"><ArrowLeft size={19} /></button>
          <div className="premium-feature-heading"><span>Focus workspace</span><h1>Study Session</h1></div>
          <span className="premium-header-mark"><Zap size={17} /></span>
        </header>

        <section className="study-session-hero glass-card" style={{ '--session-accent': accent }}>
          <div className="session-context"><div><span className="session-kicker">STUDYING</span><h2>{course.name}</h2><p>{goal}</p></div><span className="session-live-pill"><span className={running ? 'live-dot is-live' : 'live-dot'} />{running ? 'LIVE' : status}</span></div>

          <div className="session-mode-tabs" role="tablist" aria-label="Study duration">
            {Object.entries({ focus: 'Focus', deep: 'Deep', sprint: 'Sprint' }).map(([key, label]) => <button type="button" key={key} className={mode === key ? 'is-selected' : ''} onClick={() => setSessionMode(key)}>{label}<small>{DURATIONS[key] / 60}m</small></button>)}
          </div>
          <div className="session-clock-wrap">
            <div className="session-orbit" style={{ '--session-progress': `${progress}%` }}><div className="session-clock"><span>{minutes}:{seconds}</span><small>{finished ? 'Complete' : running ? 'Focus time' : 'Remaining'}</small></div></div>
          </div>
          <div className="session-progress-track"><span style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${accent}, #bd86ff)` }} /></div>
          <div className="session-controls">
            <button type="button" className="session-reset-button" onClick={reset} aria-label="Reset session"><RotateCcw size={17} /></button>
            <button type="button" className="session-main-button" onClick={toggleRunning} style={{ background: `linear-gradient(145deg, ${accent}, #7b61ff)` }}>{running ? <Pause size={19} /> : <Play size={19} fill="currentColor" />}{running ? 'Pause focus' : 'Start focus'}</button>
            <button type="button" className="session-finish-button" onClick={completeNow}><Check size={17} />Finish</button>
          </div>
        </section>

        <section className="session-goal-row glass-inner">
          <div><span className="session-small-label">SESSION GOAL</span><strong>{goal}</strong></div>
          <button type="button" onClick={() => setGoal(goal === 'Review course notes' ? 'Practice key concepts' : 'Review course notes')} aria-label="Change session goal"><TimerReset size={16} /></button>
        </section>

        <section className="session-stat-grid" aria-label="Session metrics">
          <article className="session-stat glass-card"><span><Clock3 size={15} /></span><strong>{sessionMinutes}m</strong><small>Active focus</small></article>
          <article className="session-stat glass-card"><span><Flame size={15} /></span><strong>{completedSessions}</strong><small>Sessions done</small></article>
          <article className="session-stat glass-card"><span><Coffee size={15} /></span><strong>{mode === 'deep' ? '10m' : '5m'}</strong><small>Break target</small></article>
        </section>

        <PomodoroPanel onComplete={() => setCompletedSessions((count) => count + 1)} />

        <section className="study-plan-builder glass-card" aria-label="Automatic study plan builder">
          <div className="study-plan-heading">
            <div><span className="session-small-label">AUTOMATIC STUDY PLAN</span><h3>Build your study rhythm</h3><p>Select a study style and the schedule is generated automatically.</p></div>
            <span className="study-plan-target"><Clock3 size={13} />{studyHours % 1 === 0 ? `${studyHours} hr` : `${studyHours.toFixed(2)} hr`} target</span>
          </div>

          <div className="study-plan-modes" role="tablist" aria-label="Study plan modes">
            {Object.entries(STUDY_PLANS).map(([key, item]) => <button type="button" key={key} className={`study-plan-mode ${studyPlanMode === key ? 'is-selected' : ''}`} onClick={() => setStudyPlanMode(key)} style={{ '--plan-accent': item.accent }}>
              <span className="study-plan-mode-top"><strong>{item.label}</strong>{studyPlanMode === key && <Check size={14} />}</span>
              <span>{item.focus} min focus · {item.rest} min rest</span>
            </button>)}
          </div>

          <div className="study-plan-duration-card">
            <div className="study-plan-duration-heading"><div><span className="session-small-label">TOTAL STUDY TIME</span><strong>{studyHours % 1 === 0 ? `${studyHours} hr` : `${studyHours.toFixed(2)} hr`}</strong></div><label><span>Hours</span><input type="number" min="1" max="5" step="0.25" value={studyHours} onChange={(event) => handleHoursInput(event.target.value)} aria-label="Study duration in hours" /></label></div>
            <input className="study-plan-range" type="range" min="1" max="5" step="0.25" value={studyHours} onChange={(event) => setStudyHours(Number(event.target.value))} aria-label="Study duration up to five hours" />
            <div className="study-plan-range-meta"><span>1 hr</span><span>5 hr max</span></div>
          </div>

          <div className="study-plan-summary">
            <div className="study-plan-summary-main"><span className="session-small-label">AUTO-GENERATED SCHEDULE</span><strong>{plan.cycles} sessions</strong><span>{plan.focusMinutes} min focus · {plan.restMinutes} min recovery · {plan.leftoverMinutes ? `${plan.leftoverMinutes} min planning buffer` : 'matches target'}</span></div>
            <div className="study-plan-summary-stats"><span><b>{Math.floor(plan.elapsedMinutes / 60)}h {plan.elapsedMinutes % 60}m</b><small>planned</small></span></div>
          </div>

          <div className="study-plan-schedule-heading"><span>Session sequence</span><span>{activePlanBlock ? `${activePlanBlock.label} selected` : 'Ready'}</span></div>
          <div className="study-plan-schedule" role="list" aria-label="Generated study schedule">
            {plan.blocks.map((block, index) => <button type="button" key={block.id} className={`study-plan-block ${block.kind} ${selectedPlanBlock === index ? 'is-selected' : ''}`} onClick={() => setSelectedPlanBlock(index)} role="listitem">
              <span className="study-plan-block-index">{index + 1}</span>
              <span className="study-plan-block-copy"><strong>{block.label}</strong><small>{`${block.kind === 'focus' ? 'Focus block' : 'Recovery block'} · Session ${block.sequence}`}</small></span>
              <span className="study-plan-block-time">{block.minutes}m</span>
            </button>)}
          </div>

          {activePlanBlock && <div className="study-plan-next glass-inner"><span className="study-plan-next-icon">{activePlanBlock.kind === 'focus' ? <Play size={14} /> : <Coffee size={14} />}</span><div><span className="session-small-label">SELECTED BLOCK</span><strong>{activePlanBlock.label} · {activePlanBlock.minutes} min</strong><small>{activePlanBlock.kind === 'focus' ? 'Stay on one course goal until this focus block ends.' : 'Step away briefly, reset, then return to the next focus block.'}</small></div></div>}
        </section>

        <section className="session-rhythm glass-card">
          <div className="session-card-heading"><div><span className="session-card-icon"><Sparkles size={15} /></span><div><span className="session-small-label">SESSION RHYTHM</span><h3>Keep the flow</h3></div></div><span className="session-chip">{completedSessions} complete</span></div>
          <div className="rhythm-row"><div><strong>Focus</strong><span>Stay on one course goal until the timer ends.</span></div><div className="rhythm-bars">{[1,2,3,4,5].map((item) => <i key={item} className={item <= Math.min(5, completedSessions + 1) ? 'is-active' : ''} />)}</div></div>
          <div className="rhythm-tip"><Sparkles size={14} /><span>{running ? 'Notifications off. Keep your attention on the current goal.' : 'Start a session when you are ready for uninterrupted study.'}</span></div>
        </section>
      </section>
    </main>
  );
}
