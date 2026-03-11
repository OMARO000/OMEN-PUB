'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PayPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Verify session exists before rendering
    fetch('/api/auth/verify-account', { method: 'GET' })
      .then((res) => {
        if (res.status === 401) {
          router.replace('/dashboard/login');
        } else {
          setReady(true);
        }
      })
      .catch(() => router.replace('/dashboard/login'));
  }, [router]);

  async function handleSubscribe() {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        setError('CHECKOUT UNAVAILABLE. TRY AGAIN.');
        return;
      }

      const { url } = await res.json();
      window.location.href = url;
    } catch {
      setError('CONNECTION ERROR');
    } finally {
      setLoading(false);
    }
  }

  if (!ready) return null;

  return (
    <div className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem', maxWidth: '480px' }}>
      <p style={{ fontSize: '0.7rem', letterSpacing: '0.2em', color: 'var(--omen-muted)', marginBottom: '0.5rem' }}>
        OMARO PBC / OMEN
      </p>
      <h1 style={{ fontSize: '1.4rem', letterSpacing: '0.05em', marginBottom: '2rem' }}>
        ACTIVATE ACCOUNT
      </h1>

      <hr className="divider" style={{ marginBottom: '2rem' }} />

      <div style={{ marginBottom: '2rem' }}>
        <p style={{
          fontSize: '1.1rem',
          fontWeight: 700,
          color: 'var(--omen-accent)',
          letterSpacing: '0.05em',
          marginBottom: '1.25rem',
        }}>
          $2 / MONTH
        </p>

        <p style={{
          fontSize: '0.75rem',
          color: 'var(--omen-muted)',
          lineHeight: 1.7,
          margin: 0,
        }}>
          Your account number is your only identity.
          <br />
          Payment is processed by Stripe. Stripe sees your account
          number and card only — nothing else.
        </p>
      </div>

      {error && (
        <p style={{
          margin: '0 0 1rem',
          fontSize: '0.75rem',
          color: 'var(--tag-ugly)',
          letterSpacing: '0.08em',
        }}>
          — {error}
        </p>
      )}

      <button
        onClick={handleSubscribe}
        disabled={loading}
        style={{
          width: '100%',
          padding: '0.65rem',
          background: 'transparent',
          border: '1px solid var(--omen-accent)',
          color: 'var(--omen-accent)',
          fontFamily: 'inherit',
          fontSize: '0.8rem',
          letterSpacing: '0.15em',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.5 : 1,
        }}
      >
        {loading ? 'REDIRECTING...' : 'SUBSCRIBE FOR $2/MONTH'}
      </button>
    </div>
  );
}
