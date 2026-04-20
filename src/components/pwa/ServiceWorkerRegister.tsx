'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      process.env.NODE_ENV !== 'production'
    ) {
      return;
    }

    const register = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .catch(() => { /* swallow — offline still works without SW */ });
    };

    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });

    // Purge any cached authenticated HTML on sign-out so the next user on
    // this device cannot see the previous session's pages offline.
    const supabase = createClient();
    const sub = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        navigator.serviceWorker.controller?.postMessage({ type: 'PURGE_CACHE' });
      }
    });

    return () => {
      sub.data.subscription.unsubscribe();
    };
  }, []);

  return null;
}
