import { cn } from '@/lib/utils';
import { DRILL_LABELS } from '@/lib/forge/constants';
import { skillIndexLabel, indexTone } from '@/lib/forge/scoring';
import type { ForgeDrillScore, ForgeSession } from '@/lib/forge/schemas';
import type { ForgeDrillType } from '@/lib/forge/constants';

interface DrillBreakdownProps {
  session?: ForgeSession;
  drills:  ForgeDrillScore[];
  className?: string;
}

const FAIRWAY = '#00C96F';
const BONE    = '#EDE8DC';
const ASH     = '#8A8A82';
const CLAY    = '#C75B39';

const DRILL_ORDER: ForgeDrillType[] = ['driving', 'approach', 'chipping', 'putting'];

function toneColour(drill: ForgeDrillType, index: number | null): string {
  if (index === null) return 'rgba(237, 232, 220, 0.25)';
  const tone = indexTone(drill, index);
  if (tone === 'elite' || tone === 'tour') return FAIRWAY;
  if (tone === 'strong' || tone === 'average') return BONE;
  if (tone === 'developing') return ASH;
  return CLAY;
}

function DrillRow({ drill, score }: { drill: ForgeDrillType; score: ForgeDrillScore | undefined }) {
  const scored = score !== undefined;
  const index  = scored ? score.skill_index : null;
  const label  = index !== null ? skillIndexLabel(drill, index) : null;
  const colour = toneColour(drill, index);

  const ballCount = scored
    ? (() => {
        const outcomes = (score.raw_inputs as Record<string, unknown>)['ball_outcomes'];
        if (Array.isArray(outcomes)) return outcomes.length;
        const tier3 = (score.raw_inputs as Record<string, unknown>)['tier_3_outcomes'] as unknown[] | undefined;
        const tier2 = (score.raw_inputs as Record<string, unknown>)['tier_2_outcomes'] as unknown[] | undefined;
        const tier1 = (score.raw_inputs as Record<string, unknown>)['tier_1_outcomes'] as unknown[] | undefined;
        return (tier3?.length ?? 0) + (tier2?.length ?? 0) + (tier1?.length ?? 0);
      })()
    : 0;

  return (
    <div
      className={cn('ryp-card p-5', !scored && 'opacity-50')}
      aria-label={`${DRILL_LABELS[drill]} drill — ${
        index !== null ? `score ${Math.round(index)}` : 'not scored'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="ryp-label">{DRILL_LABELS[drill]}</p>
          {scored && (
            <p style={{ color: BONE, fontSize: 13, marginTop: 4 }}>
              {ballCount} {drill === 'putting' ? 'putts' : 'shots'}
            </p>
          )}
          {!scored && (
            <p style={{ color: ASH, fontSize: 12, marginTop: 4 }}>Not scored</p>
          )}
        </div>

        {scored && (
          <div className="text-right flex-shrink-0">
            <p
              className="ryp-mono"
              style={{ fontSize: 28, fontWeight: 500, lineHeight: 1, color: colour }}
            >
              {index! > 0 ? `+${Math.round(index!)}` : Math.round(index!)}
            </p>
            <p style={{ color: ASH, fontSize: 11, marginTop: 4 }}>{label}</p>
          </div>
        )}
      </div>

      {scored && score.notes && (
        <p className="mt-3 line-clamp-2" style={{ color: ASH, fontSize: 12 }}>
          {score.notes}
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
