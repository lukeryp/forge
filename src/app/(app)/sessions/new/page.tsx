/**
 * /forge/sessions/new — Start a new FORGE session (Server Component shell)
 *
 * Fetches the player ID server-side, then hands off to
 * NewSessionForm (client component) for the interactive wizard.
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { NewSessionForm } from '@/components/forge/NewSessionForm';

export const dynamic = 'force-dynamic';

export default async function NewForgSessionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: player } = await supabase
    .from('players')
    .select('id')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single();

  if (!player) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
        <p className="text-muted-foreground text-sm">
          No player profile found. Ask your coach or admin to set one up.
        </p>
        <Link href="/" className="text-brand-green text-sm hover:underline">
          Back to FORGE
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-fade-in">
      {/* Back nav */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Back to FORGE
      </Link>

      {/* Glass card wrapping the form */}
      <div className="glass rounded-2xl border border-white/[0.06] p-6">
        <NewSessionForm playerId={player.id} />
      </div>
    </div>
  );
}
