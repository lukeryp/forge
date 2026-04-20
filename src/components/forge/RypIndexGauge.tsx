import { cn } from '@/lib/utils';
import { compositeTier } from '@/lib/forge/scoring';
import { RYP_INDEX_MIN_DRILLS } from '@/lib/forge/constants';

interface RypIndexGaugeProps {
  rypIndex:      number | null;
  pillarsScored: number;
  compact?:      boolean;
  className?:    string;
}

const FAIRWAY = '#00C96F';
const BONE    = '#EDE8DC';
const ASH     = '#8A8A82';
const CLAY    = '#C75B39';

// Clamp for progress arc. Map signed Ryp Index (roughly −15..+25) to 0..100%.
function progressPct(index: number | null): number {
  if (index === null) return 0;
  const minIdx = -15;
  const maxIdx = 25;
  const pct = 100 - ((index - minIdx) / (maxIdx - minIdx)) * 100; // lower index = fuller arc
  return Math.max(0, Math.min(100, pct));
}

function toneColour(tone: string): string {
  switch (tone) {
    case 'elite':
    case 'tour':
      return FAIRWAY;
    case 'strong':
    case 'average':
      return BONE;
    case 'developing':
      return ASH;
    case 'needs_work':
    default:
      return CLAY;
  }
}

function ArcGauge({
  pct,
  colour,
  size,
  strokeWidth,
}: {
  pct:         number;
  colour:      string;
  size:        number;
  strokeWidth: number;
}) {
  const radius   = (size - strokeWidth) / 2;
  const center   = size / 2;
  const arcDeg   = 270;
  const circ     = 2 * Math.PI * radius;
  const arcLen   = (arcDeg / 360) * circ;
  const progress = (pct / 100) * arcLen;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle
        cx={center} cy={center} r={radius}
        fill="none"
        stroke="rgba(237, 232, 220, 0.10)"
        strokeWidth={strokeWidth}
        strokeDasharray={`${arcLen} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(${180 - (360 - arcDeg) / 2}, ${center}, ${center})`}
      />
      <circle
        cx={center} cy={center} r={radius}
        fill="none"
        stroke={colour}
        strokeWidth={strokeWidth}
        strokeDasharray={`${progress} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(${180 - (360 - arcDeg) / 2}, ${center}, ${center})`}
        style={{ transition: 'stroke-dasharray 600ms ease-out' }}
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
  const tier       = rypIndex !== null ? compositeTier(rypIndex) : null;
  const colour     = tier ? toneColour(tier.tone) : ASH;
  const pct        = progressPct(rypIndex);
  const label      = tier?.label ?? '—';
  const signed     = rypIndex !== null
    ? (rypIndex > 0 ? `+${Math.round(rypIndex)}` : Math.round(rypIndex))
    : '—';

  if (compact) {
    return (
      <div className={cn('relative flex items-center gap-3', className)}>
        <div className="relative" style={{ width: 56, height: 56 }}>
          <ArcGauge pct={pct} colour={colour} size={56} strokeWidth={5} />
          <span
            className="absolute inset-0 flex items-center justify-center ryp-mono"
            style={{ fontSize: 13, fontWeight: 500, color: colour }}
          >
            {signed}
          </span>
        </div>
        <div>
          <p className="ryp-label">FORGE Index</p>
          <p style={{ color: colour, fontSize: 14, fontWeight: 600, marginTop: 2 }}>
            {label}
          </p>
          {!isComplete && rypIndex !== null && (
            <p className="ryp-mono" style={{ fontSize: 11, color: ASH }}>
              {pillarsScored}/4 drills
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <div className="relative" style={{ width: 180, height: 180 }}>
        <ArcGauge pct={pct} colour={colour} size={180} strokeWidth={10} />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="ryp-mono"
            style={{
              fontSize: 48,
              fontWeight: 500,
              lineHeight: 1,
              letterSpacing: '-0.02em',
              color: colour,
            }}
          >
            {signed}
          </span>
          <span className="ryp-label" style={{ marginTop: 6 }}>
            FORGE Index
          </span>
        </div>
      </div>

      <div className="text-center">
        <p style={{ color: colour, fontSize: 18, fontWeight: 600 }}>{label}</p>
        <p style={{ color: ASH, fontSize: 13, marginTop: 2 }}>FORGE Performance Index</p>
        {!isComplete && rypIndex !== null && (
          <p className="ryp-label" style={{ marginTop: 8 }}>
            Partial — {pillarsScored} of 4 drills scored
          </p>
        )}
        {rypIndex === null && (
          <p className="ryp-label" style={{ marginTop: 8 }}>
            No drills scored yet
          </p>
        )}
      </div>
    </div>
  );
}
