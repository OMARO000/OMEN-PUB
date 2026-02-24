'use client';

import { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('[OMEN] Unhandled error:', error);
  }, [error]);

  return (
    <div
      className="container"
      style={{ paddingTop: '4rem', paddingBottom: '4rem' }}
    >
      <h1 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
        An error occurred.
      </h1>
      <p style={{ color: 'var(--omen-muted)', marginBottom: '2rem', maxWidth: '480px' }}>
        Something went wrong loading this page. The error has been logged.
        {error.digest && (
          <span style={{ display: 'block', marginTop: '0.5rem', fontSize: '0.8rem' }}>
            Reference: {error.digest}
          </span>
        )}
      </p>
      <button
        onClick={reset}
        style={{
          background: 'transparent',
          border: '1px solid var(--omen-border)',
          color: 'var(--omen-text)',
          padding: '0.5rem 1rem',
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: '0.875rem',
        }}
      >
        Try again
      </button>
    </div>
  );
}
