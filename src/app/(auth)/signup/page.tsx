'use client';

import { Suspense, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { createClient } from '@/lib/supabase/client';

const HCAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY;

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/';

  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [info,  setInfo]        = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<HCaptcha>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (HCAPTCHA_SITE_KEY && !captchaToken) {
      setError('Please complete the captcha.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: signErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name: name.trim() || null },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          captchaToken: captchaToken ?? undefined,
        },
      });

      // hCaptcha tokens are single-use; reset after every submit attempt
      captchaRef.current?.resetCaptcha();
      setCaptchaToken(null);

      if (signErr) {
        setError(signErr.message);
        return;
      }

      // If email confirmations are enabled in Supabase, session will be null.
      if (!data.session) {
        setInfo('Check your inbox to confirm your email, then sign in.');
        return;
      }

      router.push(next);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: 'var(--surface-primary)' }}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-4">
            <svg width="44" height="22" viewBox="0 0 32 16" fill="none" aria-hidden="true">
              <path d="M 2 13 Q 16 -3, 30 13" stroke="#00C96F" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="ryp-brand" style={{ fontSize: 24, color: 'var(--text-primary)' }}>
              FORGE
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Create your FORGE account.
          </p>
        </div>

        <div className="ryp-card p-8">
          <form onSubmit={(e) => { e.preventDefault(); void handleSubmit(e); }} className="space-y-5">
            {error && (
              <div
                className="text-sm rounded-[8px] px-4 py-3"
                style={{
                  background: 'rgba(199, 91, 57, 0.10)',
                  border: '1px solid rgba(199, 91, 57, 0.30)',
                  color: '#C75B39',
                }}
                role="alert"
              >
                {error}
              </div>
            )}

            {info && (
              <div
                className="text-sm rounded-[8px] px-4 py-3"
                style={{
                  background: 'rgba(0, 201, 111, 0.08)',
                  border: '1px solid rgba(0, 201, 111, 0.30)',
                  color: '#00C96F',
                }}
                role="status"
              >
                {info}
              </div>
            )}

            <div>
              <label htmlFor="name" className="ryp-label block mb-2">
                Name
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="ryp-input"
                placeholder="Optional"
              />
            </div>

            <div>
              <label htmlFor="email" className="ryp-label block mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="ryp-input"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="ryp-label block mb-2">
                Password — at least 8 characters
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="ryp-input"
                  placeholder="••••••••"
                  style={{ paddingRight: 60 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 0,
                    color: 'var(--text-muted)',
                    fontSize: 12,
                    fontWeight: 500,
                    padding: '6px 8px',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-ui)',
                  }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {HCAPTCHA_SITE_KEY && (
              <div className="flex justify-center">
                <HCaptcha
                  ref={captchaRef}
                  sitekey={HCAPTCHA_SITE_KEY}
                  theme="dark"
                  onVerify={(token) => setCaptchaToken(token)}
                  onExpire={() => setCaptchaToken(null)}
                  onError={() => setCaptchaToken(null)}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (!!HCAPTCHA_SITE_KEY && !captchaToken)}
              className="ryp-btn-primary w-full"
              style={{ padding: '12px 16px' }}
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p
            className="text-center mt-6"
            style={{ color: 'var(--text-muted)', fontSize: 13 }}
          >
            Already have an account?{' '}
            <Link href="/login" style={{ color: '#EDE8DC' }} className="hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={<div className="min-h-screen" style={{ background: 'var(--surface-primary)' }} />}
    >
      <SignupForm />
    </Suspense>
  );
}
