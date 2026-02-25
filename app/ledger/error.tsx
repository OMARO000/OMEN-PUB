'use client';

import { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function LedgerError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('[OMEN/ledger] Error:', error);
  }, [error]);

  return (
    <div className="container" style={{ paddingTop: '3rem' }}>
      <h1 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Failed to load Ledger.</h1>
      <p style={{ color: 'var(--omen-muted)', marginBottom: '1.5rem' }}>
        {error.digest && <span style={{ fontSize: '0.8rem' }}>Ref: {error.digest}</span>}
      </p>
      <button
        onClick={reset}
        style={{ background: 'transparent', border: '1px solid var(--omen-border)', color: 'var(--omen-text)', padding: '0.5rem 1rem', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.875rem', letterSpacing: '0.05em' }}
      >
        TRY AGAIN &gt;
      </button>
    </div>
  );
}
