export const metadata = {
  title: 'Offline',
};

export default function OfflinePage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: 'var(--surface-primary)' }}
    >
      <div className="max-w-md text-center">
        <svg width="56" height="28" viewBox="0 0 32 16" fill="none" aria-hidden="true" className="mx-auto">
          <path d="M 2 13 Q 16 -3, 30 13" stroke="#00C96F" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <h1 className="ryp-h2" style={{ marginTop: 24 }}>You&rsquo;re offline.</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 8 }}>
          Your sessions are local until the device reconnects. Scores you enter now will sync when you&rsquo;re back online.
        </p>
        <a href="/" className="ryp-btn-primary inline-flex mt-8">
          Try again
        </a>
      </div>
    </div>
  );
}
