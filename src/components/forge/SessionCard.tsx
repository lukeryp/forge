/**
 * SessionCard
 *
 * Glass-morphism card showing a single FORGE session summary.
 * Displays date, RYP index (compact gauge), per-pillar indexes,
 * and a completion status badge.
 */

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { RypIndexGauge } from './RypIndexGauge';
import { DRILL_LABELS } from '@/lib/forge/constants';
import { computeRypIndex } from '@/lib/forge/scoring';
import type { ForgeSession } from '@/lib/forge/schemas';
import type { ForgeDrillType } from '@/lib/forge/constants';

interface SessionCardProps {
  session:   ForgeSession;
  className?: string;
}

function PillarBar({
  label,
  index,
}: {
  label: string;
  index: number | null;
}) {
  const pct   = index ?? 0;
  const color = index === null
    ? 'bg-white/10'
    : pct >= 75
      ? 'bg-brand-green'
      : pct >= 50
        ? 'bg-brand-yellow'
        : 'bg-red-400';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn('font-semibold tabular-nums', index === null && 'text-muted-foreground/50')}>
          {index !== null ? Math.round(index) : '—'}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
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

  const isComplete     = Boolean(session.completed_at);
  const pillarsScored  = rypResult?.pillars_scored ?? 0;

  const displayDate = new Date(session.session_date + 'T00:00:00').toLocaleDateString(
    'en-US',
    { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' },
  );

  return (
    <Link
      href={`/forge/sessions/${session.id}`}
      className={cn(
        'glass block rounded-2xl border border-white/[0.06] p-5',
        'hover:border-brand-green/30 hover:bg-white/[0.04] transition-all duration-200',
        'active:scale-[0.99]',
        className,
      )}
      aria-label={`Session on ${displayDate} — RYP Index ${session.ryp_index ?? 'incomplete'}`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-sm font-semibold">{displayDate}</p>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={cn(
                'inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border',
                isComplete
                  ? 'bg-brand-green/10 text-brand-green border-brand-green/20'
                  : 'bg-brand-yellow/10 text-brand-yellow border-brand-yellow/20',
              )}
            >
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  isComplete ? 'bg-brand-green' : 'bg-brand-yellow',
                )}
              />
              {isComplete ? 'Complete' : 'In Progress'}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {pillarsScored}/4 drills
            </span>
          </div>
        </div>

        {/* Compact RYP index */}
        <RypIndexGauge
          rypIndex={session.ryp_index}
          pillarsScored={pillarsScored}
          compact
        />
      </div>

      {/* Pillar breakdown bars */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {DRILLS.map((drill) => (
          <PillarBar
            key={drill}
            label={DRILL_LABELS[drill]}
            index={session[`${drill}_index` as keyof ForgeSession] as number | null}
          />
        ))}
      </div>

      {/* Notes preview */}
      {session.notes && (
        <p className="mt-3 text-[11px] text-muted-foreground/70 line-clamp-1 italic">
          &ldquo;{session.notes}&rdquo;
        </p>
      )}
    </Link>
  );
}
