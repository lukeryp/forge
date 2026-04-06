/**
 * /forge/sessions/[id] — Session detail page (Server Component)
 *
 * Shows:
 *   - Session date and status
 *   - RYP Performance Index gauge (full size)
 *   - Per-drill breakdown with game type and skill index
 *   - Session notes
 *   - Action: add missing drills (if session is incomplete)
 *   - Action: delete session (with confirmation via client component)
 */

import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { RypIndexGauge } from '@/components/forge/RypIndexGauge';
import { DrillBreakdown } from '@/components/forge/DrillBreakdown';
import { getForgeSessionWithDrills } from '@/lib/forge/queries';
import { computeRypIndex } from '@/lib/forge/scoring';
import { FORGE_DRILL_TYPES } from '@/lib/forge/constants';
import type { ForgeDrillType } from '@/lib/forge/constants';

export const dynamic = 'force-dynamic';

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

  const isComplete       = Boolean(session.completed_at);
  const pillarsScored    = rypResult?.pillars_scored ?? 0;
  const scoredDrillTypes = new Set(session.forge_drill_scores.map((d) => d.drill_type));
  const missedDrills     = FORGE_DRILL_TYPES.filter((d) => !scoredDrillTypes.has(d)) as ForgeDrillType[];

  const displayDate = new Date(session.session_date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
      {/* Back nav */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        FORGE
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Session</p>
          <h1 className="text-xl font-bold">{displayDate}</h1>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${
              isComplete
                ? 'bg-brand-green/10 text-brand-green border-brand-green/20'
                : 'bg-brand-yellow/10 text-brand-yellow border-brand-yellow/20'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isComplete ? 'bg-brand-green' : 'bg-brand-yellow'}`} />
              {isComplete ? 'Complete' : 'In Progress'}
            </span>
            <span className="text-[10px] text-muted-foreground">{pillarsScored}/4 drills</span>
          </div>
        </div>

        {/* Continue button for in-progress sessions */}
        {!isComplete && (
          <Link
            href="/sessions/new"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-yellow/10 border border-brand-yellow/30 px-4 py-2 text-sm font-medium text-brand-yellow hover:bg-brand-yellow/15 transition"
          >
            Continue Scoring →
          </Link>
        )}
      </div>

      {/* RYP Index */}
      <div className="glass rounded-2xl border border-white/[0.06] p-6 flex flex-col items-center">
        <RypIndexGauge
          rypIndex={session.ryp_index}
          pillarsScored={pillarsScored}
        />
      </div>

      {/* Drill breakdown */}
      <div>
        <h2 className="text-base font-semibold mb-3">Drill Scores</h2>
        <DrillBreakdown drills={session.forge_drill_scores} />
      </div>

      {/* Missing drills callout */}
      {missedDrills.length > 0 && !isComplete && (
        <div className="rounded-xl border border-brand-yellow/20 bg-brand-yellow/[0.05] px-4 py-3">
          <p className="text-sm font-medium text-brand-yellow mb-1">
            {missedDrills.length} drill{missedDrills.length > 1 ? 's' : ''} not scored
          </p>
          <p className="text-xs text-muted-foreground">
            Score {missedDrills.map((d) => d).join(', ')} to complete your RYP Performance Index.
          </p>
        </div>
      )}

      {/* Session notes */}
      {session.notes && (
        <div className="glass rounded-2xl border border-white/[0.06] px-4 py-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">Notes</p>
          <p className="text-sm text-foreground/80 italic">{session.notes}</p>
        </div>
      )}

      {/* Metadata footer */}
      <div className="text-xs text-muted-foreground/50 space-y-0.5 pb-4">
        <p>Created: {new Date(session.created_at).toLocaleString()}</p>
        {session.completed_at && (
          <p>Completed: {new Date(session.completed_at).toLocaleString()}</p>
        )}
      </div>
    </div>
  );
}
