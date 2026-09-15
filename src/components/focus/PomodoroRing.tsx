import { useId } from 'react';
import './PomodoroRing.css';

function formatTime(totalSeconds: number) {
  const numericSeconds = Number.isFinite(Number(totalSeconds)) ? Number(totalSeconds) : 0;
  const safe = Math.max(0, Math.ceil(numericSeconds));
  const minutes = Math.floor(safe / 60).toString().padStart(2, '0');
  const seconds = (safe % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

type Props = {
  remaining: number;
  total: number;
  label?: string;
  running?: boolean;
};

export function PomodoroRing({ remaining, total, label, running = false }: Props) {
  const safeTotal = Math.max(1, Number.isFinite(Number(total)) ? Number(total) : 1);
  const safeRemaining = Math.min(safeTotal, Math.max(0, Number.isFinite(Number(remaining)) ? Number(remaining) : 0));
  const progress = safeRemaining / safeTotal;

  const size = 320;
  const radius = 138;
  const circumference = 2 * Math.PI * radius;

  // Leave a small opening at the top so the countdown has a clear, visible front edge.
  const maxArcFraction = 0.985;
  const visibleFraction = progress * maxArcFraction;
  const arcLength = circumference * visibleFraction;

  const idBase = useId().replace(/:/g, '');
  const glowId = `${idBase}-glow`;
  const headGlowId = `${idBase}-head-glow`;

  // The SVG is rotated -90deg so the countdown begins at 12 o'clock.
  // Calculate the leading edge in the SVG's original coordinate system; the SVG rotation
  // moves it to the actual visible edge without applying a second rotation.
  const headAngleRad = visibleFraction * 2 * Math.PI;
  const headX = size / 2 + radius * Math.cos(headAngleRad);
  const headY = size / 2 + radius * Math.sin(headAngleRad);

  // This marker intentionally stays fixed at the bottom center. It is independent of the
  // moving countdown edge and provides the persistent liquid-glow anchor from the design.
  const fixedDotX = size / 2 - radius;
  const fixedDotY = size / 2;

  return (
    <div className={`pomodoro-ring${running ? ' is-running' : ''}`}>
      <svg viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <defs>
          <filter id={glowId} x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={headGlowId} x="-300%" y="-300%" width="700%" height="700%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#eaf6ff"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeDashoffset="0"
          filter={`url(#${glowId})`}
          className="pomodoro-ring-arc"
        />

        {visibleFraction > 0.003 && (
          <circle
            cx={headX}
            cy={headY}
            r="8"
            fill="#ffffff"
            filter={`url(#${headGlowId})`}
            className="pomodoro-ring-head"
          />
        )}

        <circle
          cx={fixedDotX}
          cy={fixedDotY}
          r="7"
          fill="#ffffff"
          className="pomodoro-ring-dot"
        />
      </svg>
      <div className="pomodoro-ring-content">
        {label && <span className="pomodoro-ring-label">{label}</span>}
        <span className="pomodoro-ring-time">{formatTime(safeRemaining)}</span>
      </div>
    </div>
  );
}
