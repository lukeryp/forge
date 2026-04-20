import Link from 'next/link';
import { cn } from '@/lib/utils';
import { RypIndexGauge } from './RypIndexGauge';
import { DRILL_LABELS } from '@/lib/forge/constants';
import { computeRypIndex, indexTone } from '@/lib/forge/scoring';
import type { ForgeSession } from '@/lib/forge/schemas';
import type { ForgeDrillType } from '@/lib/forge/constants';

interface SessionCardProps {
  session:   ForgeSession;
  className?: string;
}

const FAIRWAY = '#00C96F';
const BONE    = '#EDE8DC';
const ASH     = '#8A8A82';
const CLAY    = '#C75B39';

function toneColour(drill: ForgeDrillType, index: number | null): string {
  if (index === null) return 'rgba(237, 232, 220, 0.25)';
  const tone = indexTone(drill, index);
  if (tone === 'elite' || tone === 'tour') return FAIRWAY;
  if (tone === 'strong' || tone === 'average') return BONE;
  if (tone === 'developing') return ASH;
  return CLAY;
}

function PillarLine({ drill, index }: { drill: ForgeDrillType; index: number | null }) {
  const colour = toneColour(drill, index);
  return (
    <div className="flex items-center justify-between">
      <span className="ryp-label" style={{ color: ASH }}>{DRILL_LABELS[drill]}</span>
      <span
        className="ryp-mono"
        style={{ fontSize: 13, fontWeight: 500, color: colour }}
      >
        {index !== null
          ? (index > 0 ? `+${Math.round(index)}` : Math.round(index))
          : '—'}
      </span>
    </div>
  );
}

export function SessionCard({ session, className }: SessionCardProps) {
  const DRILLS: ForgeDrillType[] = ['driving', 'approach', 'chipping', 'putting'];

  const rypResult = computeRypIndex({
    driving_index:  session.driving_index,
    approach_index: session.approach_index,
    chipping_index: session.chipping_index,
    putting_index:  session.putting_index,
  });

  const isComplete    = Boolean(session.completed_at);
  const pillarsScored = rypResult?.pillars_scored ?? 0;

  const displayDate = new Date(session.session_date + 'T00:00:00').toLocaleDateString(
    'en-US',
    { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' },
  );

  return (
    <Link
      href={`/sessions/${session.id}`}
      className={cn('ryp-card-interactive block p-5', className)}
      aria-label={`Session on ${displayDate} — FORGE Index ${session.ryp_index ?? 'incomplete'}`}
    >
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <p className="ryp-label" style={{ color: ASH }}>
            SESSION_{session.id.slice(0, 8).toUpperCase()}
          </p>
          <p style={{ fontSize: 15, fontWeight: 600, color: BONE, marginTop: 4 }}>
            {displayDate}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span
              className="inline-flex items-center gap-1.5"
              style={{ fontSize: 11, color: isComplete ? FAIRWAY : ASH }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: isComplete ? FAIRWAY : ASH }}
              />
              {isComplete ? 'Complete' : 'In progress'}
            </span>
            <span className="ryp-mono" style={{ fontSize: 11, color: ASH }}>
              · {pillarsScored}/4 drills
            </span>
          </div>
        </div>

        <RypIndexGauge
          rypIndex={session.ryp_index}
          pillarsScored={pillarsScored}
          compact
        />
      </div>

      <div className="grid grid-cols-2 gap-x-5 gap-y-3">
        {DRILLS.map((drill) => (
          <PillarLine
            key={drill}
            drill={drill}
            index={session[`${drill}_index` as keyof ForgeSession] as number | null}
          />
        ))}
      </div>

      {session.notes && (
        <p className="mt-4 line-clamp-1" style={{ fontSize: 12, color: ASH }}>
          {session.notes}
        </p>
      )}
    </Link>
  );
}
