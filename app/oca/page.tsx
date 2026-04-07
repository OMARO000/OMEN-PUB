'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { OCA_CATEGORIES } from '@/db/schema';
import type { OcaCategory } from '@/db/schema';

interface Alternative {
  id: number;
  name: string;
  category: string;
  websiteUrl: string | null;
  replaces: string | null;
  whyBetter: string | null;
  openSource: boolean;
  selfHostable: boolean;
  upvotes: number;
  downvotes: number;
  score?: number;
}

type Sort = 'voted' | 'newest' | 'alpha';

export default function OcaPage() {
  return <OcaBrowse initialCategory={null} />;
}

export function OcaBrowse({ initialCategory }: { initialCategory: OcaCategory | null }) {
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<OcaCategory | null>(initialCategory);
  const [sort, setSort] = useState<Sort>('voted');
  const [isPaid, setIsPaid] = useState(false);
  const [userVotes, setUserVotes] = useState<Map<number, 'up' | 'down'>>(new Map());
  const [voting, setVoting] = useState<number | null>(null);

  // Check session/payment status
  useEffect(() => {
    fetch('/api/auth/verify-account')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.isPaid) setIsPaid(true); })
      .catch(() => {});
  }, []);

  const fetchAlternatives = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ sort });
    if (category) params.set('category', category);
    try {
      const res = await fetch(`/api/oca/list?${params}`);
      if (res.ok) setAlternatives(await res.json().then((d) => d.alternatives ?? []));
    } catch {
      setAlternatives([]);
    } finally {
      setLoading(false);
    }
  }, [category, sort]);

  useEffect(() => { fetchAlternatives(); }, [fetchAlternatives]);

  async function handleVote(altId: number, vote: 'up' | 'down') {
    if (!isPaid || voting !== null) return;
    setVoting(altId);
    try {
      const res = await fetch('/api/oca/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alternativeId: altId, vote }),
      });
      if (res.ok) {
        const { upvotes, downvotes } = await res.json();
        setAlternatives((prev) =>
          prev.map((a) => (a.id === altId ? { ...a, upvotes, downvotes } : a)),
        );
        setUserVotes((prev) => new Map(prev).set(altId, vote));
      }
    } catch {
      // silent
    } finally {
      setVoting(null);
    }
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '0.55rem',
    letterSpacing: '0.15em',
    color: 'var(--omen-muted)',
    padding: '0.25rem 0.5rem',
    border: '1px solid var(--omen-border)',
    background: 'transparent',
    fontFamily: 'inherit',
    cursor: 'pointer',
  };

  const activeLabelStyle: React.CSSProperties = {
    ...labelStyle,
    borderColor: 'var(--omen-accent)',
    color: 'var(--omen-accent)',
  };

  return (
    <div className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem', maxWidth: '720px' }}>
      <p style={{ fontSize: '0.7rem', letterSpacing: '0.2em', color: 'var(--omen-muted)', marginBottom: '0.5rem' }}>
        OMEN / OCA
      </p>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.5rem' }}>
        <h1 style={{ fontSize: '1.4rem', letterSpacing: '0.05em' }}>
          ALTERNATIVES
        </h1>
        <Link
          href="/oca/submit"
          style={{
            fontSize: '0.65rem',
            letterSpacing: '0.15em',
            color: 'var(--omen-accent)',
            textDecoration: 'none',
          }}
        >
          SUBMIT ONE →
        </Link>
      </div>
      <p style={{ fontSize: '0.75rem', color: 'var(--omen-muted)', marginBottom: '2rem' }}>
        Crowdsourced alternatives to companies in the ledger.
      </p>

      <hr className="divider" style={{ marginBottom: '1.5rem' }} />

      {/* Category filter */}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <button
          onClick={() => setCategory(null)}
          style={category === null ? activeLabelStyle : labelStyle}
        >
          ALL
        </button>
        {OCA_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            style={category === cat ? activeLabelStyle : labelStyle}
          >
            {cat.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Sort */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '2rem' }}>
        {(['voted', 'newest', 'alpha'] as Sort[]).map((s) => (
          <button
            key={s}
            onClick={() => setSort(s)}
            style={sort === s ? activeLabelStyle : labelStyle}
          >
            {s === 'voted' ? 'MOST VOTED' : s === 'newest' ? 'NEWEST' : 'A–Z'}
          </button>
        ))}
      </div>

      {loading && (
        <p style={{ fontSize: '0.7rem', color: 'var(--omen-muted)', letterSpacing: '0.15em' }}>
          LOADING...
        </p>
      )}

      {!loading && alternatives.length === 0 && (
        <p style={{ fontSize: '0.8rem', color: 'var(--omen-muted)' }}>
          -- NO ALTERNATIVES YET. BE THE FIRST TO SUBMIT ONE. --
        </p>
      )}

      {!loading && alternatives.map((alt) => (
        <AlternativeCard
          key={alt.id}
          alt={alt}
          isPaid={isPaid}
          userVote={userVotes.get(alt.id) ?? null}
          voting={voting === alt.id}
          onVote={handleVote}
        />
      ))}
    </div>
  );
}

function AlternativeCard({
  alt,
  isPaid,
  userVote,
  voting,
  onVote,
}: {
  alt: Alternative;
  isPaid: boolean;
  userVote: 'up' | 'down' | null;
  voting: boolean;
  onVote: (id: number, vote: 'up' | 'down') => void;
}) {
  const voteBtn = (dir: 'up' | 'down'): React.CSSProperties => ({
    background: userVote === dir ? 'rgba(0,255,65,0.08)' : 'transparent',
    border: `1px solid ${userVote === dir ? 'var(--omen-accent)' : 'var(--omen-border)'}`,
    color: userVote === dir ? 'var(--omen-accent)' : 'var(--omen-muted)',
    fontFamily: 'inherit',
    fontSize: '0.65rem',
    padding: '0.2rem 0.5rem',
    cursor: isPaid && !voting ? 'pointer' : 'not-allowed',
    opacity: voting ? 0.5 : 1,
    letterSpacing: '0.05em',
  });

  return (
    <div style={{
      borderBottom: '1px solid var(--omen-border)',
      padding: '1rem 0',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
        {/* Left: info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--omen-text)' }}>
              {alt.name}
            </span>
            <span style={{ fontSize: '0.55rem', letterSpacing: '0.15em', color: 'var(--omen-muted)', border: '1px solid var(--omen-border)', padding: '0.1rem 0.35rem' }}>
              {alt.category.toUpperCase()}
            </span>
            {alt.openSource && (
              <span style={{ fontSize: '0.55rem', letterSpacing: '0.1em', color: 'var(--tag-good)', border: '1px solid var(--tag-good)', padding: '0.1rem 0.35rem' }}>
                OPEN SOURCE
              </span>
            )}
            {alt.selfHostable && (
              <span style={{ fontSize: '0.55rem', letterSpacing: '0.1em', color: '#7eb8d4', border: '1px solid #7eb8d4', padding: '0.1rem 0.35rem' }}>
                SELF-HOST
              </span>
            )}
          </div>

          {alt.replaces && (
            <p style={{ margin: '0 0 0.25rem', fontSize: '0.7rem', color: 'var(--omen-muted)' }}>
              Replaces: {alt.replaces}
            </p>
          )}

          {alt.whyBetter && (
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.73rem', color: 'var(--omen-text)', lineHeight: 1.5 }}>
              {alt.whyBetter}
            </p>
          )}

          {alt.websiteUrl && (
            <a
              href={alt.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '0.65rem', color: 'var(--omen-accent)', textDecoration: 'none', letterSpacing: '0.05em' }}
            >
              VISIT WEBSITE ›
            </a>
          )}
        </div>

        {/* Right: votes */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
            <button
              onClick={() => isPaid && onVote(alt.id, 'up')}
              disabled={!isPaid || voting}
              style={voteBtn('up')}
              title={isPaid ? undefined : 'Join Data Co-op to vote'}
            >
              ↑ {alt.upvotes}
            </button>
            <button
              onClick={() => isPaid && onVote(alt.id, 'down')}
              disabled={!isPaid || voting}
              style={voteBtn('down')}
              title={isPaid ? undefined : 'Join Data Co-op to vote'}
            >
              ↓ {alt.downvotes}
            </button>
          </div>
          {!isPaid && (
            <p style={{ margin: 0, fontSize: '0.55rem', color: 'var(--omen-muted)', textAlign: 'right' }}>
              Join Data Co-op to vote
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
