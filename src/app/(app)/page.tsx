import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { RypIndexGauge } from '@/components/forge/RypIndexGauge';
import { SessionCard } from '@/components/forge/SessionCard';
import { listForgeSessions, getPersonalBests, ensureForgeProfile } from '@/lib/forge/queries';
import { computeRypIndex, indexTone } from '@/lib/forge/scoring';
import { DRILL_LABELS } from '@/lib/forge/constants';
import type { ForgeDrillType } from '@/lib/forge/constants';

export const dynamic = 'force-dynamic';

const FAIRWAY = '#00C96F';
const BONE    = '#EDE8DC';
const ASH     = '#8A8A82';
const CLAY    = '#C75B39';

function bestColour(drill: ForgeDrillType, best: number | null): string {
  if (best === null) return 'rgba(237, 232, 220, 0.25)';
  const tone = indexTone(drill, best);
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

export default async function ForgeDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  await ensureForgeProfile(supabase, user.id, user.email ?? undefined);

  const [{ sessions: recentSessions }, bests] = await Promise.all([
    listForgeSessions(supabase, user.id, { limit: 5, includeInProgress: true }),
    getPersonalBests(supabase, user.id),
  ]);

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
    <div className="space-y-10 animate-fade-in">
      <section>
        <p className="ryp-label">FORGE Performance Index · last session</p>
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-8">
          <RypIndexGauge
            rypIndex={latestRyp?.ryp_index ?? null}
            pillarsScored={latestRyp?.pillars_scored ?? 0}
          />

          <div className="flex-1 w-full space-y-5">
            {latest && (
              <div>
                <p className="ryp-label">Last session</p>
                <p style={{ color: BONE, fontSize: 15, fontWeight: 500, marginTop: 4 }}>
                  {new Date(latest.session_date + 'T00:00:00').toLocaleDateString('en-US', {
                    weekday: 'long', month: 'short', day: 'numeric',
                  })}
                </p>
              </div>
            )}

            <div>
              <p className="ryp-label">Personal bests — lower is better</p>
              <div className="grid grid-cols-2 gap-3 mt-3">
                {PILLARS.map(({ drill, bestKey }) => {
                  const best = bests[bestKey] as number | null;
                  return (
                    <div key={drill} className="ryp-card p-4">
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
              <p className="ryp-mono" style={{ fontSize: 11, color: ASH, marginTop: 12 }}>
                {bests.sessions_total} completed session{bests.sessions_total !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="ryp-h3">Recent sessions</h2>
          <Link href="/history" className="ryp-btn-tertiary">View all →</Link>
        </div>

        {recentSessions.length === 0 ? (
          <div className="ryp-card p-10 flex flex-col items-center gap-4 text-center">
            {/* No hero arc here — the header wordmark already carries the motif.
                Constitution allows one arc per screen. */}
            <div>
              <p style={{ color: BONE, fontSize: 15, fontWeight: 500 }}>No sessions yet</p>
              <p style={{ color: ASH, fontSize: 13, marginTop: 6 }}>
                Start your first FORGE session to build your performance index.
              </p>
            </div>
            <Link href="/sessions/new" className="ryp-btn-primary">
              Start first session
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentSessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

