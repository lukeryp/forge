import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { RypIndexGauge } from '@/components/forge/RypIndexGauge';
import { DrillBreakdown } from '@/components/forge/DrillBreakdown';
import { getForgeSessionWithDrills } from '@/lib/forge/queries';
import { computeRypIndex } from '@/lib/forge/scoring';
import { FORGE_DRILL_TYPES, DRILL_LABELS } from '@/lib/forge/constants';
import type { ForgeDrillType } from '@/lib/forge/constants';

export const dynamic = 'force-dynamic';

const FAIRWAY = '#00C96F';
const BONE    = '#EDE8DC';
const ASH     = '#8A8A82';
const CLAY    = '#C75B39';

interface PageParams {
  params: Promise<{ id: string }>;
}

export default async function ForgeSessionDetailPage({ params }: PageParams) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const session = await getForgeSessionWithDrills(supabase, id);
  if (!session) notFound();

  const rypResult = computeRypIndex({
    driving_index:  session.driving_index,
    approach_index: session.approach_index,
    chipping_index: session.chipping_index,
    putting_index:  session.putting_index,
  });

  const isComplete    = Boolean(session.completed_at);
  const pillarsScored = rypResult?.pillars_scored ?? 0;
  const scoredDrillTypes = new Set(session.forge_drill_scores.map((d) => d.drill_type));
  const missedDrills = FORGE_DRILL_TYPES.filter(
    (d) => !scoredDrillTypes.has(d),
  ) as ForgeDrillType[];

  const displayDate = new Date(session.session_date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="max-w-2xl mx-auto space-y-10 animate-fade-in">
      <Link href="/" className="ryp-btn-tertiary" style={{ color: ASH }}>
        ← FORGE
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="ryp-label">
            SESSION_{session.id.slice(0, 8).toUpperCase()}
          </p>
          <h1 className="ryp-h2" style={{ marginTop: 8 }}>{displayDate}</h1>
          <div className="flex items-center gap-2 mt-3">
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

        {!isComplete && (
          <Link href="/sessions/new" className="ryp-btn-secondary">
            Continue scoring →
          </Link>
        )}
      </div>

      {/* RYP Index */}
      <div className="ryp-card p-8 flex flex-col items-center">
        <RypIndexGauge
          rypIndex={session.ryp_index}
          pillarsScored={pillarsScored}
        />
      </div>

      {/* Drill breakdown */}
      <div>
        <h2 className="ryp-h3" style={{ marginBottom: 16 }}>Drill scores</h2>
        <DrillBreakdown drills={session.forge_drill_scores} />
      </div>

      {/* Missing drills callout */}
      {missedDrills.length > 0 && !isComplete && (
        <div
          className="px-5 py-4"
          style={{
            background: 'rgba(199, 91, 57, 0.06)',
            border: '1px solid rgba(199, 91, 57, 0.30)',
            borderRadius: 12,
          }}
        >
          <p style={{ color: CLAY, fontSize: 14, fontWeight: 500 }}>
            {missedDrills.length} drill{missedDrills.length > 1 ? 's' : ''} not scored
          </p>
          <p style={{ color: ASH, fontSize: 12, marginTop: 4 }}>
            Score {missedDrills.map((d) => DRILL_LABELS[d]).join(', ')} to complete your FORGE Performance Index.
          </p>
        </div>
      )}

      {/* Session notes */}
      {session.notes && (
        <div className="ryp-card px-5 py-4">
          <p className="ryp-label">Notes</p>
          <p style={{ color: BONE, fontSize: 14, marginTop: 6 }}>{session.notes}</p>
        </div>
      )}

      {/* Metadata footer */}
      <div
        className="ryp-mono pb-4"
        style={{ color: ASH, fontSize: 11, opacity: 0.7 }}
      >
        <p>Created: {new Date(session.created_at).toLocaleString()}</p>
        {session.completed_at && (
          <p>Completed: {new Date(session.completed_at).toLocaleString()}</p>
        )}
      </div>
    </div>
  );
}
