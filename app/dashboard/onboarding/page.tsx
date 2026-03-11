'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface CompanyResult {
  id: number;
  name: string;
  ticker: string;
  slug: string;
  violationCount?: number;
}

type ActivePath = 'search' | 'browse' | 'quickpick' | null;

export default function OnboardingPage() {
  const router = useRouter();
  const [activePath, setActivePath] = useState<ActivePath>(null);
  const [tracked, setTracked] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<string | null>(null);

  // Search state
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CompanyResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Quick pick state
  const [topCompanies, setTopCompanies] = useState<CompanyResult[]>([]);
  const [loadingTop, setLoadingTop] = useState(false);

  // Fetch top companies when quick pick opens
  useEffect(() => {
    if (activePath !== 'quickpick' || topCompanies.length > 0) return;
    setLoadingTop(true);
    fetch('/api/dashboard/companies/top')
      .then((r) => r.json())
      .then((data) => setTopCompanies(data.companies ?? []))
      .catch(() => {})
      .finally(() => setLoadingTop(false));
  }, [activePath, topCompanies.length]);

  // Debounced search
  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/dashboard/companies/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSearchResults(data.companies ?? []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => search(query), 300);
    return () => clearTimeout(id);
  }, [query, search]);

  async function toggle(ticker: string) {
    setSaving(ticker);
    const action = tracked.has(ticker) ? 'remove' : 'add';
    try {
      const res = await fetch('/api/dashboard/track-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker, action }),
      });
      if (res.ok) {
        setTracked((prev) => {
          const next = new Set(prev);
          action === 'add' ? next.add(ticker) : next.delete(ticker);
          return next;
        });
      }
    } catch {
      // silent
    } finally {
      setSaving(null);
    }
  }

  const cardBase: React.CSSProperties = {
    border: '1px solid var(--omen-border)',
    background: 'var(--omen-surface)',
    padding: '1.25rem',
    cursor: 'pointer',
  };

  const cardActive: React.CSSProperties = {
    ...cardBase,
    borderColor: 'var(--omen-accent)',
  };

  return (
    <div className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem', maxWidth: '640px' }}>
      <p style={{ fontSize: '0.7rem', letterSpacing: '0.2em', color: 'var(--omen-muted)', marginBottom: '0.5rem' }}>
        OMEN / DASHBOARD
      </p>
      <h1 style={{ fontSize: '1.4rem', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
        TRACK COMPANIES
      </h1>
      <p style={{ fontSize: '0.75rem', color: 'var(--omen-muted)', marginBottom: '2rem' }}>
        Select companies to see their documented violations.
      </p>

      <hr className="divider" style={{ marginBottom: '1.5rem' }} />

      {/* Path cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {/* Search */}
        <div
          style={activePath === 'search' ? cardActive : cardBase}
          onClick={() => setActivePath(activePath === 'search' ? null : 'search')}
        >
          <p style={{ margin: '0 0 0.25rem', fontSize: '0.65rem', letterSpacing: '0.15em', color: 'var(--omen-accent)' }}>
            SEARCH
          </p>
          <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--omen-muted)', lineHeight: 1.5 }}>
            Find a specific company
          </p>
        </div>

        {/* Browse */}
        <Link
          href="/ledger"
          style={{
            ...cardBase,
            display: 'block',
            textDecoration: 'none',
          }}
          onClick={() => setActivePath('browse')}
        >
          <p style={{ margin: '0 0 0.25rem', fontSize: '0.65rem', letterSpacing: '0.15em', color: 'var(--omen-accent)' }}>
            BROWSE
          </p>
          <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--omen-muted)', lineHeight: 1.5 }}>
            Explore the full ledger
          </p>
        </Link>

        {/* Quick pick */}
        <div
          style={activePath === 'quickpick' ? cardActive : cardBase}
          onClick={() => setActivePath(activePath === 'quickpick' ? null : 'quickpick')}
        >
          <p style={{ margin: '0 0 0.25rem', fontSize: '0.65rem', letterSpacing: '0.15em', color: 'var(--omen-accent)' }}>
            QUICK PICK
          </p>
          <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--omen-muted)', lineHeight: 1.5 }}>
            Top 50 by violations
          </p>
        </div>
      </div>

      {/* Search panel */}
      {activePath === 'search' && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            border: '1px solid var(--omen-border)',
            background: 'var(--omen-surface)',
            padding: '0.5rem 0.75rem',
            gap: '0.5rem',
            marginBottom: '0.75rem',
          }}>
            <span style={{ color: 'var(--omen-accent)', fontSize: '0.875rem', flexShrink: 0 }}>›</span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="COMPANY NAME OR TICKER"
              autoFocus
              spellCheck={false}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--omen-text)',
                fontFamily: 'inherit',
                fontSize: '0.875rem',
                letterSpacing: '0.05em',
                width: '100%',
                caretColor: 'var(--omen-accent)',
              }}
            />
          </div>

          {searching && (
            <p style={{ fontSize: '0.7rem', color: 'var(--omen-muted)' }}>SEARCHING...</p>
          )}

          {!searching && searchResults.length === 0 && query.trim() && (
            <p style={{ fontSize: '0.7rem', color: 'var(--omen-muted)' }}>NO RESULTS</p>
          )}

          {searchResults.map((co) => (
            <CompanyRow
              key={co.ticker}
              company={co}
              tracked={tracked.has(co.ticker)}
              saving={saving === co.ticker}
              onToggle={toggle}
            />
          ))}
        </div>
      )}

      {/* Quick pick panel */}
      {activePath === 'quickpick' && (
        <div style={{ marginBottom: '1.5rem' }}>
          {loadingTop && (
            <p style={{ fontSize: '0.7rem', color: 'var(--omen-muted)' }}>LOADING...</p>
          )}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: '0.5rem',
          }}>
            {topCompanies.map((co) => {
              const isTracked = tracked.has(co.ticker);
              return (
                <button
                  key={co.ticker}
                  onClick={() => toggle(co.ticker)}
                  disabled={saving === co.ticker}
                  style={{
                    background: isTracked ? 'rgba(0,255,65,0.06)' : 'var(--omen-surface)',
                    border: `1px solid ${isTracked ? 'var(--omen-accent)' : 'var(--omen-border)'}`,
                    color: isTracked ? 'var(--omen-accent)' : 'var(--omen-text)',
                    fontFamily: 'inherit',
                    padding: '0.5rem 0.6rem',
                    textAlign: 'left',
                    cursor: saving === co.ticker ? 'not-allowed' : 'pointer',
                    opacity: saving === co.ticker ? 0.5 : 1,
                  }}
                >
                  <p style={{ margin: '0 0 0.1rem', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em' }}>
                    {co.ticker}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.6rem', color: 'var(--omen-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {co.name}
                  </p>
                  {co.violationCount !== undefined && (
                    <p style={{ margin: '0.15rem 0 0', fontSize: '0.6rem', color: 'var(--tag-ugly)' }}>
                      {co.violationCount} violations
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Tracked summary + CTA */}
      {tracked.size > 0 && (
        <div style={{ borderTop: '1px solid var(--omen-border)', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
          <p style={{ fontSize: '0.7rem', color: 'var(--omen-muted)', marginBottom: '1rem' }}>
            TRACKING {tracked.size} {tracked.size === 1 ? 'COMPANY' : 'COMPANIES'}
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            style={{
              padding: '0.65rem 1.5rem',
              background: 'transparent',
              border: '1px solid var(--omen-accent)',
              color: 'var(--omen-accent)',
              fontFamily: 'inherit',
              fontSize: '0.8rem',
              letterSpacing: '0.15em',
              cursor: 'pointer',
            }}
          >
            VIEW MY EXPOSURE →
          </button>
        </div>
      )}
    </div>
  );
}

function CompanyRow({
  company,
  tracked,
  saving,
  onToggle,
}: {
  company: CompanyResult;
  tracked: boolean;
  saving: boolean;
  onToggle: (ticker: string) => void;
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: '1px solid var(--omen-border)',
      padding: '0.6rem 0',
      gap: '1rem',
    }}>
      <div>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--omen-accent)', marginRight: '0.6rem' }}>
          {company.ticker}
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--omen-text)' }}>
          {company.name}
        </span>
      </div>
      <button
        onClick={() => onToggle(company.ticker)}
        disabled={saving}
        style={{
          background: tracked ? 'rgba(0,255,65,0.06)' : 'transparent',
          border: `1px solid ${tracked ? 'var(--omen-accent)' : 'var(--omen-border)'}`,
          color: tracked ? 'var(--omen-accent)' : 'var(--omen-muted)',
          fontFamily: 'inherit',
          fontSize: '0.6rem',
          letterSpacing: '0.12em',
          padding: '0.25rem 0.6rem',
          cursor: saving ? 'not-allowed' : 'pointer',
          opacity: saving ? 0.5 : 1,
          flexShrink: 0,
        }}
      >
        {tracked ? 'TRACKING' : 'TRACK'}
      </button>
    </div>
  );
}
