'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export function InstallPrompt() {
  const pathname = usePathname();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [standalone, setStandalone] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setStandalone(
      window.matchMedia('(display-mode: standalone)').matches ||
      // @ts-expect-error — iOS Safari
      window.navigator.standalone === true,
    );
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));
    setDismissed(localStorage.getItem('forge_install_dismissed') === '1');

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const installedHandler = () => {
      localStorage.setItem('forge_install_dismissed', '1');
      setDismissed(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  // Never prompt on auth routes — the user hasn't seen value yet.
  if (pathname?.startsWith('/login') || pathname?.startsWith('/signup') ||
      pathname?.startsWith('/offline') || pathname?.startsWith('/auth/')) {
    return null;
  }

  if (standalone || dismissed) return null;
  if (!deferred && !isIOS) return null;

  const dismiss = () => {
    localStorage.setItem('forge_install_dismissed', '1');
    setDismissed(true);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };

  return (
    <div
      role="dialog"
      aria-label="Install FORGE"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md animate-slide-up rounded-[12px] border p-4"
      style={{
        background: 'var(--surface-elevated)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[10px]"
          style={{ background: 'var(--surface-primary)', border: '1px solid var(--border-subtle)' }}
        >
          <svg width="22" height="11" viewBox="0 0 32 16" fill="none" stroke="#00C96F" strokeWidth="2" strokeLinecap="round">
            <path d="M 2 13 Q 16 -3, 30 13" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="ryp-label">Install FORGE</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-primary)' }}>
            {isIOS
              ? 'Tap Share, then Add to Home Screen.'
              : 'Add FORGE to your home screen for offline practice tracking.'}
          </p>
          <div className="mt-3 flex items-center gap-2">
            {!isIOS && deferred && (
              <button onClick={install} className="ryp-btn-primary" type="button">
                Install
              </button>
            )}
            <button onClick={dismiss} className="ryp-btn-tertiary" type="button">
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
