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
import { indexTone } from '@/lib/forge/scoring';
import { DRILL_LABELS } from '@/lib/forge/constants';
import type { ForgeDrillType } from '@/lib/forge/constants';

export const dynamic = 'force-dynamic';

const FAIRWAY = '#00C96F';
const BONE    = '#EDE8DC';
const ASH     = '#8A8A82';
const CLAY    = '#C75B39';

function bestColour(drill: ForgeDrillType | 'composite', best: number | null): string {
  if (best === null) return 'rgba(237, 232, 220, 0.25)';
  const tone = indexTone(drill === 'composite' ? 'approach' : drill, best);
  if (tone === 'elite' || tone === 'tour') return FAIRWAY;
  if (tone === 'strong' || tone === 'average') return BONE;
  if (tone === 'developing') return ASH;
  return CLAY;
}

function signed(n: number | null): string {
  if (n === null) return '—';
  const r = Math.round(n);
  return r > 0 ? `+${r}` : String(r);
}

export default async function ForgeHistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ sessions }, history, bests] = await Promise.all([
    listForgeSessions(supabase, user.id, { limit: 50 }),
    getForgeHistory(supabase, user.id),
    getPersonalBests(supabase, user.id),
  ]);

  const PILLARS: Array<{ drill: ForgeDrillType; bestKey: keyof typeof bests }> = [
    { drill: 'driving',  bestKey: 'driving_index_best' },
    { drill: 'approach', bestKey: 'approach_index_best' },
    { drill: 'chipping', bestKey: 'chipping_index_best' },
    { drill: 'putting',  bestKey: 'putting_index_best' },
  ];

  return (
    <div className="space-y-10 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link href="/" className="ryp-btn-tertiary" style={{ color: ASH }}>
            ← Dashboard
          </Link>
          <h1 className="ryp-h1" style={{ marginTop: 12 }}>History</h1>
          <p className="ryp-mono" style={{ color: ASH, fontSize: 13, marginTop: 6 }}>
            {bests.sessions_total} completed session{bests.sessions_total !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/sessions/new" className="ryp-btn-primary">
          + New session
        </Link>
      </div>

      <section className="ryp-card p-5">
        <p className="ryp-label">Personal bests — lower is better</p>
        <div className="flex items-center gap-6 mt-4 overflow-x-auto pb-1">
          <div className="flex-shrink-0">
            <p className="ryp-label">FORGE Index</p>
            <p
              className="ryp-mono"
              style={{
                fontSize: 32,
                fontWeight: 500,
                marginTop: 4,
                color: bestColour('composite', bests.ryp_index_best),
                lineHeight: 1,
              }}
            >
              {signed(bests.ryp_index_best)}
            </p>
          </div>
          <div className="w-px h-12 flex-shrink-0" style={{ background: 'var(--border-subtle)' }} />
          {PILLARS.map(({ drill, bestKey }) => {
            const best = bests[bestKey] as number | null;
            return (
              <div key={drill} className="flex-shrink-0">
                <p className="ryp-label">{DRILL_LABELS[drill]}</p>
                <p
                  className="ryp-mono"
                  style={{
                    fontSize: 28,
                    fontWeight: 500,
                    marginTop: 4,
                    color: bestColour(drill, best),
                    lineHeight: 1,
                  }}
                >
                  {signed(best)}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {history.length > 0 && (
        <section className="ryp-card p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="ryp-h3">FORGE Index trend</h2>
            <p className="ryp-mono" style={{ color: ASH, fontSize: 11 }}>
              {history.length} sessions
            </p>
          </div>
          <ProgressChart history={history} />
        </section>
      )}

      <section>
        <h2 className="ryp-h3" style={{ marginBottom: 16 }}>All sessions</h2>
        {sessions.length === 0 ? (
          <div className="ryp-card p-10 text-center">
            <p style={{ color: ASH, fontSize: 14 }}>No completed sessions yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
