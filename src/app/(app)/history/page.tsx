/**
 * /forge/history — Full session history with progress charts (Server Component)
 *
 * Fetches all completed sessions and historical data server-side.
 * Passes to client-side ProgressChart for interactive chart rendering.
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProgressChart } from '@/components/forge/ProgressChart';
import { SessionCard } from '@/components/forge/SessionCard';
import {
  listForgeSessions,
  getForgeHistory,
  getPersonalBests,
} from '@/lib/forge/queries';
import { DRILL_LABELS } from '@/lib/forge/constants';
import type { ForgeDrillType } from '@/lib/forge/constants';

export const dynamic = 'force-dynamic';

export default async function ForgeHistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: player } = await supabase
    .from('players')
    .select('id')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single();

  if (!player) redirect('/');

  const [{ sessions }, history, bests] = await Promise.all([
    listForgeSessions(supabase, player.id, { limit: 50 }),
    getForgeHistory(supabase, player.id),
    getPersonalBests(supabase, player.id),
  ]);

  const PILLARS: Array<{ drill: ForgeDrillType; bestKey: keyof typeof bests }> = [
    { drill: 'driving',  bestKey: 'driving_index_best' },
    { drill: 'approach', bestKey: 'approach_index_best' },
    { drill: 'chipping', bestKey: 'chipping_index_best' },
    { drill: 'putting',  bestKey: 'putting_index_best' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition mb-2"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            FORGE Dashboard
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">History</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {bests.sessions_total} completed session{bests.sessions_total !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/sessions/new"
          className="inline-flex items-center gap-2 rounded-xl bg-brand-green px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-green/90 transition active:scale-[0.98]"
        >
          New Session
        </Link>
      </div>

      {/* Personal bests strip */}
      <div className="glass rounded-2xl border border-white/[0.06] p-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3">
          Personal Bests
        </p>
        <div className="flex items-center gap-4 overflow-x-auto pb-1">
          {/* RYP Index best */}
          <div className="flex-shrink-0 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">RYP Index</p>
            <p className="text-2xl font-bold tabular-nums mt-0.5" style={{
              color: bests.ryp_index_best !== null ? '#00af51' : 'rgba(255,255,255,0.25)',
            }}>
              {bests.ryp_index_best !== null ? Math.round(bests.ryp_index_best) : '—'}
            </p>
          </div>
          <div className="w-px h-10 bg-white/[0.08] flex-shrink-0" />
          {PILLARS.map(({ drill, bestKey }) => {
            const best = bests[bestKey] as number | null;
            return (
              <div key={drill} className="flex-shrink-0 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{DRILL_LABELS[drill]}</p>
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
      </div>

      {/* Progress chart */}
      {history.length > 0 && (
        <div className="glass rounded-2xl border border-white/[0.06] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold">RYP Index Trend</h2>
            <p className="text-xs text-muted-foreground">{history.length} sessions</p>
          </div>
          <ProgressChart history={history} />
        </div>
      )}

      {/* Full session list */}
      <div>
        <h2 className="text-base font-semibold mb-3">All Sessions</h2>
        {sessions.length === 0 ? (
          <div className="glass rounded-2xl border border-white/[0.06] p-8 text-center">
            <p className="text-muted-foreground text-sm">No completed sessions yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
