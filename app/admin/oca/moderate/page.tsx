'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface PendingAlternative {
  id: number;
  name: string;
  category: string;
  websiteUrl: string | null;
  replaces: string | null;
  whyBetter: string | null;
  openSource: boolean;
  selfHostable: boolean;
  submittedBy: string | null;
  createdAt: number | null;
}

export default function AdminOcaModeratePage() {
  const router = useRouter();
  const [items, setItems] = useState<PendingAlternative[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<number | null>(null);
  const [reasons, setReasons] = useState<Record<number, string>>({});

  useEffect(() => {
    fetch('/api/admin/oca/pending')
      .then((r) => {
        if (r.status === 401) { router.replace('/admin/login'); return null; }
        return r.json();
      })
      .then((d) => { if (d) setItems(d.alternatives ?? []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  async function moderate(id: number, action: 'approve' | 'reject') {
    setActing(id);
    try {
      const res = await fetch('/api/admin/oca/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alternativeId: id, action, reason: reasons[id] }),
      });
      if (res.ok) {
        setItems((prev) => prev.filter((item) => item.id !== id));
      }
    } catch {
      // silent
    } finally {
      setActing(null);
    }
  }

  function truncateAccount(account: string | null): string {
    if (!account) return '—';
    return account.slice(0, 9) + '···';
  }

  return (
    <div className="container" style={{ paddingTop: '2.5rem', paddingBottom: '4rem' }}>
      <p style={{ fontSize: '0.7rem', letterSpacing: '0.2em', color: 'var(--omen-muted)', marginBottom: '0.5rem' }}>
        ADMIN / OCA
      </p>
      <h1 style={{ fontSize: '1.5rem', letterSpacing: '0.05em', marginBottom: '1.5rem' }}>
        ALTERNATIVE MODERATION
      </h1>

      <p style={{ fontSize: '0.75rem', color: 'var(--omen-muted)', marginBottom: '0.5rem' }}>
        {loading ? 'LOADING...' : `${items.length} PENDING`}
      </p>

      <hr className="divider" style={{ marginBottom: '1.5rem' }} />

      {!loading && items.length === 0 && (
        <p style={{ fontSize: '0.8rem', color: 'var(--omen-muted)' }}>
          -- QUEUE EMPTY. --
        </p>
      )}

      {items.map((item) => {
        const isActing = acting === item.id;
        const submittedDate = item.createdAt
          ? new Date(item.createdAt).toISOString().slice(0, 10)
          : '—';

        return (
          <div
            key={item.id}
            style={{
              borderBottom: '1px solid var(--omen-border)',
              padding: '1.25rem 0',
            }}
          >
            {/* Header row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 100px', gap: '1rem', marginBottom: '0.6rem', alignItems: 'start' }}>
              <div>
                <p style={{ margin: '0 0 0.15rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--omen-text)' }}>
                  {item.name}
                </p>
                {item.websiteUrl && (
                  <a
                    href={item.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: '0.65rem', color: 'var(--omen-muted)', textDecoration: 'none' }}
                  >
                    {item.websiteUrl.replace(/^https?:\/\//, '')} ›
                  </a>
                )}
              </div>
              <span style={{ fontSize: '0.65rem', color: 'var(--omen-muted)', paddingTop: '0.15rem' }}>
                {item.category.toUpperCase()}
              </span>
              <span style={{ fontSize: '0.6rem', color: 'var(--omen-muted)', paddingTop: '0.15rem' }}>
                {truncateAccount(item.submittedBy)}
              </span>
              <span style={{ fontSize: '0.6rem', color: 'var(--omen-muted)', paddingTop: '0.15rem' }}>
                {submittedDate}
              </span>
            </div>

            {/* Details */}
            {item.replaces && (
              <p style={{ margin: '0 0 0.2rem', fontSize: '0.7rem', color: 'var(--omen-muted)' }}>
                Replaces: {item.replaces}
              </p>
            )}
            {item.whyBetter && (
              <p style={{ margin: '0 0 0.6rem', fontSize: '0.73rem', color: 'var(--omen-text)', lineHeight: 1.5 }}>
                {item.whyBetter}
              </p>
            )}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem', fontSize: '0.6rem', color: 'var(--omen-muted)' }}>
              {item.openSource && <span style={{ color: 'var(--tag-good)' }}>OPEN SOURCE</span>}
              {item.selfHostable && <span style={{ color: '#7eb8d4' }}>SELF-HOSTABLE</span>}
            </div>

            {/* Rejection reason input */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={reasons[item.id] ?? ''}
                onChange={(e) => setReasons((prev) => ({ ...prev, [item.id]: e.target.value }))}
                placeholder="Rejection reason (optional)"
                style={{
                  background: 'var(--omen-surface)',
                  border: '1px solid var(--omen-border)',
                  color: 'var(--omen-text)',
                  fontFamily: 'inherit',
                  fontSize: '0.7rem',
                  padding: '0.35rem 0.6rem',
                  outline: 'none',
                  width: '260px',
                }}
              />
              <button
                onClick={() => moderate(item.id, 'approve')}
                disabled={isActing}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--omen-accent)',
                  color: 'var(--omen-accent)',
                  fontFamily: 'inherit',
                  fontSize: '0.65rem',
                  letterSpacing: '0.12em',
                  padding: '0.35rem 0.75rem',
                  cursor: isActing ? 'not-allowed' : 'pointer',
                  opacity: isActing ? 0.5 : 1,
                }}
              >
                APPROVE
              </button>
              <button
                onClick={() => moderate(item.id, 'reject')}
                disabled={isActing}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--tag-ugly)',
                  color: 'var(--tag-ugly)',
                  fontFamily: 'inherit',
                  fontSize: '0.65rem',
                  letterSpacing: '0.12em',
                  padding: '0.35rem 0.75rem',
                  cursor: isActing ? 'not-allowed' : 'pointer',
                  opacity: isActing ? 0.5 : 1,
                }}
              >
                REJECT
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
