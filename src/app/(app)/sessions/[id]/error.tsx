'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function ForgeSessionDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[FORGE session detail error]', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-5 text-center px-4">
      <p className="ryp-label" style={{ color: '#C75B39' }}>
        Error
      </p>
      <div>
        <p className="ryp-h3">Failed to load session</p>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 6 }}>
          This session may no longer exist or you may not have access.
        </p>
      </div>
      <div className="flex gap-3">
        <button onClick={reset} className="ryp-btn-secondary">
          Try again
        </button>
        <Link href="/" className="ryp-btn-primary">
          Back to FORGE
        </Link>
      </div>
    </div>
  );
}
