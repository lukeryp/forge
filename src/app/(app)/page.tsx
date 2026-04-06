/**
 * /forge — FORGE dashboard (Server Component)
 *
 * Shows:
 *   - Latest RYP Performance Index
 *   - Personal bests for each pillar
 *   - 5 most recent completed sessions
 *   - CTA to start a new session
 *   - Link to full history
 *
 * All data fetching happens server-side. The page is fully populated
 * before it reaches the client — no loading spinners at the top level.
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { RypIndexGauge } from '@/components/forge/RypIndexGauge';
import { SessionCard } from '@/components/forge/SessionCard';
import {
  listForgeSessions,
  getPersonalBests,
} from '@/lib/forge/queries';
import { computeRypIndex } from '@/lib/forge/scoring';
import { DRILL_LABELS } from '@/lib/forge/constants';
import type { ForgeDrillType } from '@/lib/forge/constants';

// Force dynamic rendering so session data is always fresh
export const dynamic = 'force-dynamic';

export default async function ForgeDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Resolve player record
  const { data: player } = await supabase
    .from('players')
    .select('id, name, handicap')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single();

  if (!player) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
        <p className="text-muted-foreground text-sm">
          No player profile found. Ask your coach or admin to set one up.
        </p>
      </div>
    );
  }

  const [{ sessions: recentSessions }, bests] = await Promise.all([
    listForgeSessions(supabase, player.id, { limit: 5 }),
    getPersonalBests(supabase, player.id),
  ]);

  // Most recent session for the headline RYP index
  const latest = recentSessions[0];
  const latestRyp = latest
    ? computeRypIndex({
        driving_index:  latest.driving_index,
        approach_index: latest.approach_index,
        chipping_index: latest.chipping_index,
        putting_index:  latest.putting_index,
      })
    : null;

  const PILLARS: Array<{ drill: ForgeDrillType; bestKey: keyof typeof bests }> = [
    { drill: 'driving',  bestKey: 'driving_index_best' },
    { drill: 'approach', bestKey: 'approach_index_best' },
    { drill: 'chipping', bestKey: 'chipping_index_best' },
    { drill: 'putting',  bestKey: 'putting_index_best' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">FORGE</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Drill scoring &amp; RYP Performance Index
          </p>
        </div>
        <Link
          href="/sessions/new"
          className="inline-flex items-center gap-2 rounded-xl bg-brand-green px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-green/90 transition active:scale-[0.98]"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Session
        </Link>
      </div>

      {/* Hero: latest RYP index + personal bests */}
      <div className="glass rounded-2xl border border-white/[0.06] p-6">
        <div className="flex flex-col sm:flex-row items-center gap-8">
          {/* Gauge */}
          <div className="flex-shrink-0">
            <RypIndexGauge
              rypIndex={latestRyp?.ryp_index ?? null}
              pillarsScored={latestRyp?.pillars_scored ?? 0}
            />
            {latest && (
              <p className="text-center text-xs text-muted-foreground mt-2">
                Last session:{' '}
                {new Date(latest.session_date + 'T00:00:00').toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric',
                })}
              </p>
            )}
          </div>

          {/* Personal bests grid */}
          <div className="flex-1 w-full">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3">
              Personal Bests
            </p>
            <div className="grid grid-cols-2 gap-3">
              {PILLARS.map(({ drill, bestKey }) => {
                const best = bests[bestKey] as number | null;
                return (
                  <div
                    key={drill}
                    className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
                  >
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
                      {DRILL_LABELS[drill]}
                    </p>
                    <p
                      className="text-2xl font-bold tabular-nums mt-0.5"
                      style={{
                        color: best === null ? 'rgba(255,255,255,0.25)'
                          : best >= 75 ? '#00af51'
                          : best >= 50 ? '#f4ee19'
                          : '#ef4444',
                      }}
                    >
                      {best !== null ? Math.round(best) : '—'}
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-3">
              {bests.sessions_total} completed session{bests.sessions_total !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Recent sessions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Recent Sessions</h2>
          <Link
            href="/history"
            className="text-xs text-brand-green hover:underline underline-offset-4"
          >
            View all →
          </Link>
        </div>

        {recentSessions.length === 0 ? (
          <div className="glass rounded-2xl border border-white/[0.06] p-8 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-brand-green/10 border border-brand-green/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium">No sessions yet</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Start your first FORGE session to build your RYP Performance Index.
              </p>
            </div>
            <Link
              href="/sessions/new"
              className="mt-1 inline-flex items-center gap-2 rounded-xl bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green/90 transition"
            >
              Start First Session
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentSessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
