'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [accountNumber, setAccountNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accountNumber.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/verify-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountNumber: accountNumber.trim() }),
      });

      if (res.status === 429) {
        setError('TOO MANY ATTEMPTS. TRY AGAIN LATER.');
        return;
      }

      const data = await res.json();

      if (data.valid) {
        router.push('/dashboard');
      } else {
        setError('ACCOUNT NUMBER NOT FOUND');
      }
    } catch {
      setError('CONNECTION ERROR');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem', maxWidth: '480px' }}>
      <p style={{ fontSize: '0.7rem', letterSpacing: '0.2em', color: 'var(--omen-muted)', marginBottom: '0.5rem' }}>
        OMARO PBC / OMEN
      </p>
      <h1 style={{ fontSize: '1.4rem', letterSpacing: '0.05em', marginBottom: '2rem' }}>
        [ login ]
      </h1>

      <hr className="divider" style={{ marginBottom: '2rem' }} />

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label
            htmlFor="account-number"
            style={{
              display: 'block',
              fontSize: '0.6rem',
              letterSpacing: '0.2em',
              color: 'var(--omen-muted)',
              marginBottom: '0.4rem',
            }}
          >
            ACCOUNT NUMBER
          </label>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            border: '1px solid var(--omen-border)',
            background: 'var(--omen-surface)',
            padding: '0.5rem 0.75rem',
            gap: '0.5rem',
          }}>
            <span style={{ color: 'var(--omen-accent)', fontSize: '0.875rem', flexShrink: 0 }}>›</span>
            <input
              id="account-number"
              type="text"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="XXXX-XXXX-XXXX-XXXX"
              autoComplete="off"
              autoFocus
              spellCheck={false}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--omen-text)',
                fontFamily: 'inherit',
                fontSize: '0.95rem',
                letterSpacing: '0.1em',
                width: '100%',
                caretColor: 'var(--omen-accent)',
              }}
            />
          </div>
          <p style={{ margin: '0.3rem 0 0', fontSize: '0.65rem', color: 'var(--omen-muted)' }}>
            Enter with or without dashes
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
          type="submit"
          disabled={loading || !accountNumber.trim()}
          style={{
            width: '100%',
            padding: '0.65rem',
            background: 'var(--omen-accent)',
            border: '1px solid var(--omen-accent)',
            color: '#000',
            fontFamily: 'inherit',
            fontSize: '0.8rem',
            letterSpacing: '0.15em',
            cursor: loading || !accountNumber.trim() ? 'not-allowed' : 'pointer',
            opacity: loading || !accountNumber.trim() ? 0.5 : 1,
            marginBottom: '1.5rem',
          }}
        >
          {loading ? '[ verifying... ]' : '[ login ]'}
        </button>
      </form>

      <p style={{ fontSize: '0.75rem', color: 'var(--omen-muted)' }}>
        Don&apos;t have an account?{' '}
        <Link
          href="/dashboard/signup"
          style={{ color: 'var(--omen-accent)', textDecoration: 'none' }}
        >
          Generate one →
        </Link>
      </p>
    </div>
  );
}
