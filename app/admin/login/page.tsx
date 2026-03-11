'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') ?? '/admin/verify';
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push(from);
      } else {
        setError('ACCESS DENIED');
      }
    } catch {
      setError('CONNECTION ERROR');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--omen-bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-ibm-plex-mono), monospace',
    }}>
      <div style={{ width: '100%', maxWidth: '360px', padding: '0 1.5rem' }}>
        <p style={{
          fontSize: '0.7rem',
          letterSpacing: '0.2em',
          color: 'var(--omen-muted)',
          marginBottom: '0.5rem',
        }}>
          OMARO PBC
        </p>
        <h1 style={{
          fontSize: '1.25rem',
          color: 'var(--omen-accent)',
          letterSpacing: '0.1em',
          marginBottom: '2rem',
        }}>
          OMEN / ADMIN
        </h1>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label
              htmlFor="password"
              style={{
                display: 'block',
                fontSize: '0.65rem',
                letterSpacing: '0.15em',
                color: 'var(--omen-muted)',
                marginBottom: '0.4rem',
              }}
            >
              ACCESS KEY
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              border: '1px solid var(--omen-border)',
              background: 'var(--omen-surface)',
              padding: '0.5rem 0.75rem',
              gap: '0.5rem',
            }}>
              <span style={{ color: 'var(--omen-accent)', fontSize: '0.875rem' }}>›</span>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                autoFocus
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--omen-text)',
                  fontFamily: 'inherit',
                  fontSize: '0.875rem',
                  width: '100%',
                  caretColor: 'var(--omen-accent)',
                }}
              />
            </div>
          </div>

          {error && (
            <p style={{
              margin: '0 0 1rem',
              fontSize: '0.75rem',
              color: 'var(--tag-ugly)',
              letterSpacing: '0.1em',
            }}>
              — {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            style={{
              width: '100%',
              padding: '0.6rem',
              background: 'transparent',
              border: '1px solid var(--omen-accent)',
              color: 'var(--omen-accent)',
              fontFamily: 'inherit',
              fontSize: '0.75rem',
              letterSpacing: '0.15em',
              cursor: loading || !password ? 'not-allowed' : 'pointer',
              opacity: loading || !password ? 0.5 : 1,
            }}
          >
            {loading ? 'VERIFYING...' : 'ENTER'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
