import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

const navLinks = [
  { href: '/',        label: 'Today' },
  { href: '/history', label: 'History' },
];

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
    <div
      className="min-h-screen pb-24 sm:pb-12"
      style={{
        background: 'var(--surface-primary)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      {/* Top nav */}
      <header
        className="sticky top-0 z-20"
        style={{
          background: 'var(--surface-primary)',
          borderBottom: '1px solid var(--border-subtle)',
          paddingTop: 'env(safe-area-inset-top)',
        }}
      >
        <div className="max-w-4xl mx-auto px-6 sm:px-12 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3" aria-label="FORGE — home">
            <svg width="32" height="16" viewBox="0 0 32 16" fill="none" aria-hidden="true">
              <path d="M 2 13 Q 16 -3, 30 13" stroke="#00C96F" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span
              className="ryp-brand"
              style={{
                fontSize: 24,
                color: 'var(--text-primary)',
              }}
            >
              FORGE
            </span>
          </Link>

          <nav className="hidden sm:flex items-center gap-8">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm font-medium transition-colors"
                style={{ color: 'var(--text-muted)' }}
              >
                {l.label}
              </Link>
            ))}
            <Link href="/sessions/new" className="ryp-btn-primary">
              + Session
            </Link>
            <form action={handleSignOut}>
              <button
                type="submit"
                className="text-sm transition-colors"
                style={{ color: 'var(--text-muted)', minHeight: 32 }}
              >
                Sign out
              </button>
            </form>
          </nav>

          <div className="flex sm:hidden items-center gap-2">
            <Link
              href="/sessions/new"
              className="ryp-btn-primary"
              style={{ padding: '8px 14px', minHeight: 40, fontSize: 13 }}
            >
              + New
            </Link>
            <Link
              href="/profile"
              aria-label="Profile and account"
              className="flex items-center justify-center"
              style={{
                width: 40,
                height: 40,
                borderRadius: 999,
                border: '1px solid var(--border-medium)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-ui)',
                fontWeight: 600,
                fontSize: 12,
              }}
            >
              {(user.email ?? '?').slice(0, 2).toUpperCase()}
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 sm:px-12 py-8 sm:py-12">
        {children}
      </main>

      {/* Mobile bottom nav — Today, History, Profile. Sign-out lives in Profile
          to avoid a destructive action adjacent to navigation. */}
      <nav
        className="fixed bottom-0 inset-x-0 z-20 sm:hidden"
        style={{
          background: 'var(--surface-primary)',
          borderTop: '1px solid var(--border-subtle)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
        aria-label="Primary"
      >
        <div className="grid grid-cols-3 h-16">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium"
              style={{ color: 'var(--text-muted)', minHeight: 44 }}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/profile"
            className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium"
            style={{ color: 'var(--text-muted)', minHeight: 44 }}
          >
            Profile
          </Link>
        </div>
      </nav>
    </div>
  );
}
