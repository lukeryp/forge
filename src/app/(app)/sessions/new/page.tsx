import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { NewSessionForm } from '@/components/forge/NewSessionForm';

export const dynamic = 'force-dynamic';

export default async function NewForgSessionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="max-w-lg mx-auto space-y-8 animate-fade-in">
      <Link href="/" className="ryp-btn-tertiary" style={{ color: 'var(--text-muted)' }}>
        ← Back to FORGE
      </Link>

      <div className="ryp-card p-6">
        <NewSessionForm />
      </div>
    </div>
  );
}
