import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ensureForgeProfile, getPersonalBests } from '@/lib/forge/queries';

export const dynamic = 'force-dynamic';

const ASH = '#8A8A82';
const BONE = '#EDE8DC';

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const profile = await ensureForgeProfile(supabase, user.id, user.email ?? undefined);
  const bests = await getPersonalBests(supabase, user.id);

  async function handleSignOut() {
    'use server';
    const sb = await createClient();
    await sb.auth.signOut();
    redirect('/login');
  }

  return (
    <div className="max-w-lg mx-auto space-y-8 animate-fade-in">
      <Link href="/" className="ryp-btn-tertiary" style={{ color: ASH }}>
        ← Dashboard
      </Link>

      <section>
        <p className="ryp-label">Profile</p>
        <h1 className="ryp-h2" style={{ marginTop: 8 }}>{profile.name ?? user.email}</h1>
        <p style={{ color: ASH, fontSize: 13, marginTop: 4 }}>{user.email}</p>
      </section>

      <section className="ryp-card p-5">
        <p className="ryp-label">Lifetime</p>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <p className="ryp-label">Sessions</p>
            <p
              className="ryp-mono"
              style={{ color: BONE, fontSize: 24, fontWeight: 500, marginTop: 4 }}
            >
              {bests.sessions_total}
            </p>
          </div>
          <div>
            <p className="ryp-label">Best FORGE Index</p>
            <p
              className="ryp-mono"
              style={{ color: BONE, fontSize: 24, fontWeight: 500, marginTop: 4 }}
            >
              {bests.ryp_index_best !== null
                ? (bests.ryp_index_best > 0 ? `+${Math.round(bests.ryp_index_best)}` : Math.round(bests.ryp_index_best))
                : '—'}
            </p>
          </div>
        </div>
      </section>

      <form action={handleSignOut}>
        <button type="submit" className="ryp-btn-secondary w-full" style={{ padding: '12px 16px' }}>
          Sign out
        </button>
      </form>
    </div>
  );
}
