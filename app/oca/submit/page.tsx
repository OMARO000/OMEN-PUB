'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { OCA_CATEGORIES } from '@/db/schema';
import type { OcaCategory } from '@/db/schema';

interface FormState {
  name: string;
  category: OcaCategory;
  websiteUrl: string;
  replaces: string;
  whyBetter: string;
  openSource: boolean;
  selfHostable: boolean;
}

const INITIAL: FormState = {
  name: '',
  category: 'Other',
  websiteUrl: '',
  replaces: '',
  whyBetter: '',
  openSource: false,
  selfHostable: false,
};

export default function OcaSubmitPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [success, setSuccess] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    fetch('/api/auth/verify-account')
      .then((r) => {
        if (r.status === 401) { router.replace('/dashboard/login'); return null; }
        return r.json();
      })
      .then((d) => {
        if (!d) return;
        if (!d.isPaid) { router.replace('/dashboard/pay'); return; }
        setAuthChecked(true);
      })
      .catch(() => router.replace('/dashboard/login'));
  }, [router]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => { const next = { ...prev }; delete next[key]; return next; });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setFieldErrors({});

    try {
      const res = await fetch('/api/oca/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.issues) { setFieldErrors(data.issues); }
        else { setError(data.error ?? 'SUBMISSION FAILED'); }
        return;
      }

      setSuccess(true);
    } catch {
      setError('CONNECTION ERROR');
    } finally {
      setLoading(false);
    }
  }

  if (!authChecked) return null;

  if (success) {
    return (
      <div className="container" style={{ paddingTop: '3rem', maxWidth: '520px' }}>
        <p style={{ fontSize: '0.7rem', letterSpacing: '0.2em', color: 'var(--omen-muted)', marginBottom: '0.5rem' }}>
          OMEN / OCA / SUBMIT
        </p>
        <p style={{ fontSize: '0.9rem', color: 'var(--omen-accent)', letterSpacing: '0.05em', marginBottom: '1.5rem' }}>
          SUBMITTED FOR REVIEW. THANK YOU.
        </p>
        <p style={{ fontSize: '0.75rem', color: 'var(--omen-muted)', lineHeight: 1.7, marginBottom: '2rem' }}>
          Your submission will appear in the directory once approved by a moderator.
        </p>
        <a
          href="/oca"
          style={{ fontSize: '0.75rem', color: 'var(--omen-accent)', textDecoration: 'none', letterSpacing: '0.1em' }}
        >
          ← BACK TO ALTERNATIVES
        </a>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'var(--omen-text)',
    fontFamily: 'inherit',
    fontSize: '0.875rem',
    width: '100%',
    caretColor: 'var(--omen-accent)',
  };

  const fieldBox: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    border: '1px solid var(--omen-border)',
    background: 'var(--omen-surface)',
    padding: '0.5rem 0.75rem',
    gap: '0.5rem',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.6rem',
    letterSpacing: '0.2em',
    color: 'var(--omen-muted)',
    marginBottom: '0.3rem',
  };

  const fieldError = (key: string) =>
    fieldErrors[key]?.[0] ? (
      <p style={{ margin: '0.2rem 0 0', fontSize: '0.65rem', color: 'var(--tag-ugly)' }}>
        {fieldErrors[key][0]}
      </p>
    ) : null;

  return (
    <div className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem', maxWidth: '520px' }}>
      <p style={{ fontSize: '0.7rem', letterSpacing: '0.2em', color: 'var(--omen-muted)', marginBottom: '0.5rem' }}>
        OMEN / OCA
      </p>
      <h1 style={{ fontSize: '1.4rem', letterSpacing: '0.05em', marginBottom: '2rem' }}>
        SUBMIT AN ALTERNATIVE
      </h1>

      <hr className="divider" style={{ marginBottom: '2rem' }} />

      <form onSubmit={handleSubmit}>
        {/* Name */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>NAME</label>
          <div style={fieldBox}>
            <span style={{ color: 'var(--omen-accent)', fontSize: '0.875rem', flexShrink: 0 }}>›</span>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="PROTONMAIL"
              autoFocus
              spellCheck={false}
              style={inputStyle}
            />
          </div>
          {fieldError('name')}
        </div>

        {/* Category */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>CATEGORY</label>
          <div style={{ ...fieldBox, padding: 0 }}>
            <select
              value={form.category}
              onChange={(e) => set('category', e.target.value as OcaCategory)}
              style={{
                ...inputStyle,
                padding: '0.5rem 0.75rem',
                background: 'var(--omen-surface)',
                border: 'none',
                appearance: 'none',
              }}
            >
              {OCA_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          {fieldError('category')}
        </div>

        {/* Website */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>WEBSITE URL</label>
          <div style={fieldBox}>
            <span style={{ color: 'var(--omen-accent)', fontSize: '0.875rem', flexShrink: 0 }}>›</span>
            <input
              type="url"
              value={form.websiteUrl}
              onChange={(e) => set('websiteUrl', e.target.value)}
              placeholder="https://proton.me"
              spellCheck={false}
              style={inputStyle}
            />
          </div>
          {fieldError('websiteUrl')}
        </div>

        {/* Replaces */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>WHAT DOES IT REPLACE? <span style={{ color: 'var(--omen-border)' }}>MAX 100 CHARS</span></label>
          <div style={fieldBox}>
            <span style={{ color: 'var(--omen-accent)', fontSize: '0.875rem', flexShrink: 0 }}>›</span>
            <input
              type="text"
              value={form.replaces}
              onChange={(e) => set('replaces', e.target.value.slice(0, 100))}
              placeholder="Gmail"
              style={inputStyle}
            />
          </div>
          <p style={{ margin: '0.15rem 0 0', fontSize: '0.6rem', color: 'var(--omen-muted)' }}>
            {form.replaces.length}/100
          </p>
          {fieldError('replaces')}
        </div>

        {/* Why better */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>WHY IS IT BETTER? <span style={{ color: 'var(--omen-border)' }}>MAX 500 CHARS</span></label>
          <div style={{ ...fieldBox, alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--omen-accent)', fontSize: '0.875rem', flexShrink: 0, paddingTop: '0.1rem' }}>›</span>
            <textarea
              value={form.whyBetter}
              onChange={(e) => set('whyBetter', e.target.value.slice(0, 500))}
              rows={4}
              style={{ ...inputStyle, resize: 'vertical' }}
              placeholder="End-to-end encrypted, no advertising, based in Switzerland..."
            />
          </div>
          <p style={{ margin: '0.15rem 0 0', fontSize: '0.6rem', color: 'var(--omen-muted)' }}>
            {form.whyBetter.length}/500
          </p>
          {fieldError('whyBetter')}
        </div>

        {/* Open source / self-hostable */}
        <div style={{ display: 'flex', gap: '2rem', marginBottom: '1.75rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.openSource}
              onChange={(e) => set('openSource', e.target.checked)}
              style={{ accentColor: 'var(--omen-accent)', width: '1rem', height: '1rem' }}
            />
            <span style={{ fontSize: '0.7rem', letterSpacing: '0.1em', color: 'var(--omen-text)' }}>
              OPEN SOURCE
            </span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.selfHostable}
              onChange={(e) => set('selfHostable', e.target.checked)}
              style={{ accentColor: 'var(--omen-accent)', width: '1rem', height: '1rem' }}
            />
            <span style={{ fontSize: '0.7rem', letterSpacing: '0.1em', color: 'var(--omen-text)' }}>
              SELF-HOSTABLE
            </span>
          </label>
        </div>

        {error && (
          <p style={{ margin: '0 0 1rem', fontSize: '0.75rem', color: 'var(--tag-ugly)', letterSpacing: '0.08em' }}>
            — {error}
          </p>
        )}

        <button
          type="submit"
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
          {loading ? 'SUBMITTING...' : 'SUBMIT FOR REVIEW'}
        </button>
      </form>
    </div>
  );
}
