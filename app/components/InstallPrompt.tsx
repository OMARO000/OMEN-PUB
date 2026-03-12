'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show on mobile
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    if (!isMobile) return;

    // Don't show if already dismissed this session
    if (sessionStorage.getItem('omen-install-dismissed')) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  function handleInstall() {
    if (!promptEvent) return;
    promptEvent.prompt();
    promptEvent.userChoice.then(() => {
      setVisible(false);
      setPromptEvent(null);
    });
  }

  function handleDismiss() {
    sessionStorage.setItem('omen-install-dismissed', '1');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="banner"
      aria-label="Install OMEN app"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: '#111111',
        borderTop: '1px solid var(--omen-border)',
        padding: '0.75rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        zIndex: 9999,
        fontFamily: 'inherit',
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: '0.8rem',
          color: 'var(--omen-muted)',
          lineHeight: 1.4,
        }}
      >
        Install OMEN on your device for offline access
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
        <button
          onClick={handleInstall}
          style={{
            background: 'var(--omen-text)',
            color: 'var(--omen-bg)',
            border: 'none',
            padding: '0.4rem 0.9rem',
            fontSize: '0.75rem',
            letterSpacing: '0.08em',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          INSTALL
        </button>
        <button
          onClick={handleDismiss}
          style={{
            background: 'transparent',
            color: 'var(--omen-muted)',
            border: '1px solid var(--omen-border)',
            padding: '0.4rem 0.9rem',
            fontSize: '0.75rem',
            letterSpacing: '0.08em',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          DISMISS
        </button>
      </div>
    </div>
  );
}
