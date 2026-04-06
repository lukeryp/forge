/**
 * RypIndexGauge
 *
 * Displays the RYP Performance Index as a circular gauge with a
 * glass-morphism card. Shows partial progress when fewer than 4 drills
 * are scored. Animates the arc on mount.
 */

import { cn } from '@/lib/utils';
import { skillIndexLabel } from '@/lib/forge/scoring';
import { RYP_INDEX_MIN_DRILLS } from '@/lib/forge/constants';

interface RypIndexGaugeProps {
  rypIndex:      number | null;
  pillarsScored: number;
  /** Show a compact (smaller) variant for use inside cards */
  compact?:      boolean;
  className?:    string;
}

function getIndexColour(score: number): string {
  if (score >= 75) return '#00af51'; // brand-green — elite / advanced
  if (score >= 50) return '#f4ee19'; // brand-yellow — developing / foundational
  return '#ef4444';                  // red — building
}

/**
 * Pure SVG arc gauge — no external dependencies, no canvas.
 * Uses a stroke-dashoffset trick for the progress arc.
 */
function ArcGauge({
  score,
  size,
  strokeWidth,
}: {
  score:       number;
  size:        number;
  strokeWidth: number;
}) {
  const radius    = (size - strokeWidth) / 2;
  const center    = size / 2;
  // Gauge covers 270° (¾ circle), starting from the bottom-left
  const arcDeg    = 270;

  const circumference = 2 * Math.PI * radius;
  const arcLength     = (arcDeg / 360) * circumference;
  const progress      = (score / 100) * arcLength;

  const colour = getIndexColour(score);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
    >
      {/* Track (background arc) */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.07)"
        strokeWidth={strokeWidth}
        strokeDasharray={`${arcLength} ${circumference}`}
        strokeDashoffset={0}
        strokeLinecap="round"
        transform={`rotate(${180 - (360 - arcDeg) / 2}, ${center}, ${center})`}
      />
      {/* Progress arc */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={colour}
        strokeWidth={strokeWidth}
        strokeDasharray={`${progress} ${circumference}`}
        strokeDashoffset={0}
        strokeLinecap="round"
        transform={`rotate(${180 - (360 - arcDeg) / 2}, ${center}, ${center})`}
        style={{
          filter: `drop-shadow(0 0 6px ${colour}88)`,
          transition: 'stroke-dasharray 0.8s ease-out',
        }}
      />
    </svg>
  );
}

export function RypIndexGauge({
  rypIndex,
  pillarsScored,
  compact = false,
  className,
}: RypIndexGaugeProps) {
  const isComplete = pillarsScored >= RYP_INDEX_MIN_DRILLS;
  const score      = rypIndex ?? 0;
  const label      = rypIndex !== null ? skillIndexLabel(score) : '—';
  const colour     = rypIndex !== null ? getIndexColour(score) : 'rgba(255,255,255,0.3)';

  if (compact) {
    return (
      <div className={cn('relative flex items-center gap-3', className)}>
        <div className="relative" style={{ width: 56, height: 56 }}>
          <ArcGauge score={score} size={56} strokeWidth={5} />
          <span
            className="absolute inset-0 flex items-center justify-center text-sm font-bold"
            style={{ color: colour }}
          >
            {rypIndex !== null ? Math.round(score) : '—'}
          </span>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">RYP Index</p>
          <p className="text-base font-semibold" style={{ color: colour }}>
            {label}
          </p>
          {!isComplete && rypIndex !== null && (
            <p className="text-[10px] text-muted-foreground">
              {pillarsScored}/4 drills
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div className="relative" style={{ width: 160, height: 160 }}>
        <ArcGauge score={score} size={160} strokeWidth={10} />
        {/* Centre text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-4xl font-bold tabular-nums"
            style={{ color: colour }}
          >
            {rypIndex !== null ? Math.round(score) : '—'}
          </span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            / 100
          </span>
        </div>
      </div>

      {/* Label row */}
      <div className="text-center">
        <p
          className="text-lg font-semibold"
          style={{ color: colour }}
        >
          {label}
        </p>
        <p className="text-xs text-muted-foreground">RYP Performance Index</p>
        {!isComplete && rypIndex !== null && (
          <p className="text-xs text-muted-foreground mt-0.5">
            Partial — {pillarsScored} of 4 drills scored
          </p>
        )}
        {rypIndex === null && (
          <p className="text-xs text-muted-foreground mt-0.5">
            No drills scored yet
          </p>
        )}
      </div>
    </div>
  );
}
