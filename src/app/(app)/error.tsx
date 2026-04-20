'use client';

import { useEffect } from 'react';

export default function ForgeErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[FORGE error boundary]', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-5 text-center px-4">
      <p className="ryp-label" style={{ color: '#C75B39' }}>
        Error
      </p>
      <div>
        <p className="ryp-h3">Something went wrong</p>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 6 }}>
          Failed to load the FORGE dashboard. Please try again.
        </p>
      </div>
      <button onClick={reset} className="ryp-btn-secondary">
        Try again
      </button>
    </div>
  );
}
