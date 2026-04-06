/**
 * DrillBreakdown
 *
 * Shows the four-pillar breakdown for a session.
 * Used on session detail pages. Displays each drill's game type,
 * raw skill index, label, and a horizontal bar.
 */

import { cn } from '@/lib/utils';
import { DRILL_LABELS, FORGE_GAME_CONFIGS, DIFFICULTY_STYLES } from '@/lib/forge/constants';
import { skillIndexLabel } from '@/lib/forge/scoring';
import type { ForgeDrillScore, ForgeSession } from '@/lib/forge/schemas';
import type { ForgeDrillType, ForgeDifficulty } from '@/lib/forge/constants';

interface DrillBreakdownProps {
  /** Session row — reserved for future use (session-level context for drill rows) */
  session?: ForgeSession;
  drills:  ForgeDrillScore[];
  className?: string;
}

const DRILL_ORDER: ForgeDrillType[] = ['driving', 'approach', 'chipping', 'putting'];

function DrillRow({ drill, score }: { drill: ForgeDrillType; score: ForgeDrillScore | undefined }) {
  const scored = score !== undefined;
  const index  = scored ? score.skill_index : null;
  const label  = index !== null ? skillIndexLabel(index) : null;
  const pct    = index ?? 0;

  const barColor =
    !scored         ? 'bg-white/10'
    : pct >= 75     ? 'bg-brand-green'
    : pct >= 50     ? 'bg-brand-yellow'
    :                 'bg-red-400';

  const gameConfig = scored && score.game_type ? FORGE_GAME_CONFIGS[score.game_type] : null;

  return (
    <div
      className={cn(
        'rounded-xl border p-4 transition-colors',
        scored
          ? 'border-white/[0.08] bg-white/[0.03]'
          : 'border-white/[0.04] bg-white/[0.01] opacity-60',
      )}
      aria-label={`${DRILL_LABELS[drill]} drill — ${index !== null ? `score ${Math.round(index)}` : 'not scored'}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-sm font-semibold">{DRILL_LABELS[drill]}</p>
          {gameConfig && (
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-muted-foreground">{gameConfig.label}</p>
              <span
                className={cn(
                  'text-[10px] font-medium px-1.5 py-0.5 rounded border',
                  DIFFICULTY_STYLES[gameConfig.difficulty as ForgeDifficulty],
                )}
              >
                {gameConfig.difficulty}
              </span>
            </div>
          )}
          {!scored && (
            <p className="text-xs text-muted-foreground/50 mt-1">Not scored</p>
          )}
        </div>

        {scored && (
          <div className="text-right flex-shrink-0">
            <p className="text-2xl font-bold tabular-nums leading-none" style={{
              color: pct >= 75 ? '#00af51' : pct >= 50 ? '#f4ee19' : '#ef4444',
            }}>
              {Math.round(pct)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-white/[0.07] overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700', barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Notes */}
      {scored && score.notes && (
        <p className="mt-2 text-[11px] text-muted-foreground/70 italic line-clamp-2">
          &ldquo;{score.notes}&rdquo;
        </p>
      )}
    </div>
  );
}

export function DrillBreakdown({ drills, className }: DrillBreakdownProps) {
  const scoreByDrill: Record<string, ForgeDrillScore> = {};
  for (const d of drills) {
    scoreByDrill[d.drill_type] = d;
  }

  return (
    <div className={cn('grid gap-3 sm:grid-cols-2', className)}>
      {DRILL_ORDER.map((drill) => (
        <DrillRow
          key={drill}
          drill={drill}
          score={scoreByDrill[drill] as ForgeDrillScore | undefined}
        />
      ))}
    </div>
  );
}
