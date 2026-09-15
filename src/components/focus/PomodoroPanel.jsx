import { Clock3, Pause, Play, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PomodoroRing } from './PomodoroRing.tsx';
import './PomodoroModal.css';

const MODES = {
  focus: { label: 'Focus', minutes: 25 },
  short: { label: 'Short Break', minutes: 5 },
  long: { label: 'Long Break', minutes: 15 },
};

function formatTime(totalSeconds) {
  const numeric = Number.isFinite(Number(totalSeconds)) ? Number(totalSeconds) : 0;
  const safe = Math.max(0, Math.ceil(numeric));
  const minutes = Math.floor(safe / 60).toString().padStart(2, '0');
  const seconds = (safe % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export default function PomodoroPanel({ onComplete }) {
  const [mode, setMode] = useState('focus');
  const duration = MODES[mode].minutes * 60;
  const [remaining, setRemaining] = useState(duration);
  const [running, setRunning] = useState(false);

  const deadlineRef = useRef(null);
  const remainingRef = useRef(duration);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    remainingRef.current = remaining;
  }, [remaining]);

  useEffect(() => {
    if (!running) return undefined;
    let frame = 0;

    const tick = () => {
      const deadline = deadlineRef.current;
      if (deadline == null) return;

      const next = Math.max(0, (deadline - performance.now()) / 1000);
      remainingRef.current = next;
      setRemaining(next);

      if (next <= 0) {
        deadlineRef.current = null;
        remainingRef.current = 0;
        setRemaining(0);
        setRunning(false);
        onCompleteRef.current?.(mode);
        return;
      }

      frame = requestAnimationFrame(tick);
    };

    tick();
    return () => cancelAnimationFrame(frame);
  }, [running, mode]);

  const status = useMemo(() => {
    if (remaining <= 0) return 'Complete';
    if (running) return 'Stay focused';
    if (remaining >= duration) return 'Ready when you are';
    return 'Paused';
  }, [duration, remaining, running]);

  const chooseMode = (nextMode) => {
    const nextDuration = MODES[nextMode].minutes * 60;
    deadlineRef.current = null;
    remainingRef.current = nextDuration;
    setMode(nextMode);
    setRemaining(nextDuration);
    setRunning(false);
  };

  const reset = () => {
    deadlineRef.current = null;
    remainingRef.current = duration;
    setRemaining(duration);
    setRunning(false);
  };

  const toggleRunning = () => {
    if (running) {
      const deadline = deadlineRef.current;
      const next = deadline == null
        ? remainingRef.current
        : Math.max(0, (deadline - performance.now()) / 1000);
      deadlineRef.current = null;
      remainingRef.current = next;
      setRemaining(next);
      setRunning(false);
      return;
    }

    const next = Math.max(0, remainingRef.current);
    if (next <= 0) {
      remainingRef.current = duration;
      setRemaining(duration);
      deadlineRef.current = performance.now() + duration * 1000;
      setRunning(true);
      return;
    }

    deadlineRef.current = performance.now() + next * 1000;
    setRunning(true);
  };

  return (
    <section className="glass-modal pomodoro-react-modal study-session-pomodoro" aria-label="Pomodoro timer">
      <header className="pomodoro-react-header">
        <div>
          <span className="eyebrow">Focus timer</span>
          <h2>Pomodoro</h2>
        </div>
        <span className="pomodoro-react-icon"><Clock3 size={17} /></span>
      </header>

      <div className="pomodoro-react-ring-area">
        <PomodoroRing remaining={remaining} total={duration} label={MODES[mode].label} running={running} />
        <p>{status}</p>
      </div>

      <div className="pomodoro-react-modes" role="tablist" aria-label="Pomodoro duration">
        {Object.entries(MODES).map(([key, item]) => (
          <button type="button" key={key} className={mode === key ? 'is-active' : ''} onClick={() => chooseMode(key)}>
            <strong>{item.label}</strong><small>{item.minutes} min</small>
          </button>
        ))}
      </div>

      <div className="pomodoro-react-controls">
        <button type="button" className="pomodoro-react-secondary" onClick={reset} aria-label="Reset Pomodoro"><RotateCcw size={17} /></button>
        <button type="button" className="pomodoro-react-primary" onClick={toggleRunning}>
          {running ? <Pause size={18} /> : <Play size={18} fill="currentColor" />}
          {running ? 'Pause' : remaining <= 0 ? 'Restart' : 'Start'}
        </button>
      </div>
      <span className="pomodoro-react-time-aria" aria-live="polite">{formatTime(remaining)}</span>
    </section>
  );
}
