'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();
  const [accountNumber, setAccountNumber] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/generate-account', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'GENERATION FAILED');
        return;
      }
      const data = await res.json();
      setAccountNumber(data.accountNumber);
    } catch {
      setError('CONNECTION ERROR');
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!accountNumber) return;
    try {
      await navigator.clipboard.writeText(accountNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable
    }
  }

  return (
    <div className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem', maxWidth: '520px' }}>
      <p style={{ fontSize: '0.7rem', letterSpacing: '0.2em', color: 'var(--omen-muted)', marginBottom: '0.5rem' }}>
        OMARO PBC / OMEN
      </p>
      <h1 style={{ fontSize: '1.4rem', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
        CREATE ACCOUNT
      </h1>
      <p style={{ fontSize: '0.8rem', color: 'var(--omen-muted)', lineHeight: 1.7, marginBottom: '2rem', maxWidth: '420px' }}>
        No email. No password. A single 16-digit number is your account.
        We cannot recover it if you lose it.
      </p>

      <hr className="divider" style={{ marginBottom: '2rem' }} />

      {!accountNumber ? (
        <>
          {error && (
            <p style={{ fontSize: '0.75rem', color: 'var(--tag-ugly)', letterSpacing: '0.08em', marginBottom: '1rem' }}>
              — {error}
            </p>
          )}
          <button
            onClick={handleGenerate}
            disabled={loading}
            style={{
              padding: '0.65rem 1.5rem',
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
            {loading ? 'GENERATING...' : 'GENERATE ACCOUNT'}
          </button>
        </>
      ) : (
        <div>
          {/* Account number display */}
          <p style={{ margin: '0 0 0.4rem', fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--omen-muted)' }}>
            YOUR ACCOUNT NUMBER
          </p>
          <p style={{
            fontSize: '1.6rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            color: 'var(--omen-accent)',
            margin: '0 0 0.75rem',
            fontFamily: 'inherit',
          }}>
            {accountNumber}
          </p>

          {/* Copy button */}
          <button
            onClick={handleCopy}
            style={{
              padding: '0.4rem 1rem',
              background: 'transparent',
              border: '1px solid var(--omen-border)',
              color: copied ? 'var(--omen-accent)' : 'var(--omen-muted)',
              fontFamily: 'inherit',
              fontSize: '0.7rem',
              letterSpacing: '0.12em',
              cursor: 'pointer',
              marginBottom: '2rem',
            }}
          >
            {copied ? 'COPIED' : 'COPY TO CLIPBOARD'}
          </button>

          {/* Warning */}
          <div style={{
            border: '1px solid var(--tag-ugly)',
            padding: '0.75rem 1rem',
            marginBottom: '1.5rem',
          }}>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--omen-text)', lineHeight: 1.7 }}>
              Save this number. It is your only way to log in.
              We cannot recover it.
            </p>
          </div>

          {/* Confirmation checkbox */}
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '0.78rem',
            color: 'var(--omen-muted)',
            cursor: 'pointer',
            marginBottom: '1.5rem',
          }}>
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              style={{ width: '1rem', height: '1rem', accentColor: 'var(--omen-accent)' }}
            />
            I have saved my account number
          </label>

          {/* Continue button */}
          <button
            onClick={() => router.push('/dashboard/pay')}
            disabled={!confirmed}
            style={{
              padding: '0.65rem 1.5rem',
              background: 'transparent',
              border: '1px solid var(--omen-accent)',
              color: 'var(--omen-accent)',
              fontFamily: 'inherit',
              fontSize: '0.8rem',
              letterSpacing: '0.15em',
              cursor: !confirmed ? 'not-allowed' : 'pointer',
              opacity: !confirmed ? 0.4 : 1,
            }}
          >
            CONTINUE TO PAYMENT →
          </button>
        </div>
      )}
    </div>
  );
}
