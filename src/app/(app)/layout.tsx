import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  async function handleSignOut() {
    'use server';
    const sb = await createClient();
    await sb.auth.signOut();
    redirect('/login');
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'hsl(222 20% 6%)' }}>
      {/* Top nav */}
      <header className="border-b sticky top-0 z-10 backdrop-blur-sm" style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(13,13,13,0.8)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: '#00af51' }}>
              F
            </div>
            <span className="font-bold tracking-tight text-sm">FORGE</span>
          </Link>

          <nav className="flex items-center gap-4">
            <Link href="/" className="text-xs font-medium transition" style={{ color: 'hsl(215 16% 47%)' }}>
              Dashboard
            </Link>
            <Link href="/history" className="text-xs font-medium transition" style={{ color: 'hsl(215 16% 47%)' }}>
              History
            </Link>
            <Link href="/sessions/new" className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition" style={{ backgroundColor: '#00af51' }}>
              + Session
            </Link>
            <form action={handleSignOut}>
              <button type="submit" className="text-xs transition" style={{ color: 'hsl(215 16% 47%)' }}>
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  );
}
