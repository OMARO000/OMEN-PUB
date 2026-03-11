'use client';

import { useEffect, useState } from 'react';
import type { RewardQuality } from '@/lib/contributions/rewards';
import { calculateReward, REWARD_RANGES } from '@/lib/contributions/rewards';
import type { ContributionType } from '@/db/schema';

interface Contribution {
  id: number;
  accountNumber: string;
  type: ContributionType;
  title: string;
  description: string;
  fileUrl: string | null;
  companyTicker: string | null;
  blockId: string | null;
  status: string;
  createdAt: number;
}

const STATUS_TABS = ['pending', 'approved', 'rejected'] as const;

export default function AdminContributionsPage() {
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  // Review state
  const [reviewing, setReviewing] = useState<number | null>(null);
  const [quality, setQuality] = useState<RewardQuality>('medium');
  const [rejectionReason, setRejectionReason] = useState('');
  const [reviewError, setReviewError] = useState('');

  async function loadContributions(status: string) {
    setLoading(true);
    const res = await fetch(`/api/admin/contributions?status=${status}`);
    if (res.ok) {
      const data = await res.json();
      setContributions(data.contributions ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadContributions(activeTab);
  }, [activeTab]);

  async function handleApprove(id: number, type: ContributionType) {
    setReviewError('');
    setReviewing(id);

    const reward = calculateReward(type, quality);

    const res = await fetch(`/api/admin/contributions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve', quality, rewardAmount: reward }),
    });

    if (res.ok) {
      setContributions((prev) => prev.filter((c) => c.id !== id));
      setExpanded(null);
    } else {
      const data = await res.json();
      setReviewError(data.error ?? 'Failed');
    }
    setReviewing(null);
  }

  async function handleReject(id: number) {
    setReviewError('');
    setReviewing(id);

    const res = await fetch(`/api/admin/contributions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject', rejectionReason: rejectionReason || undefined }),
    });

    if (res.ok) {
      setContributions((prev) => prev.filter((c) => c.id !== id));
      setExpanded(null);
      setRejectionReason('');
    } else {
      const data = await res.json();
      setReviewError(data.error ?? 'Failed');
    }
    setReviewing(null);
  }

  return (
    <main id="main-content" className="page-container">
      <section aria-labelledby="admin-contributions-heading">
        <h1 id="admin-contributions-heading" className="page-title">CONTRIBUTION REVIEW</h1>

        <nav style={{ display: 'flex', gap: '0', marginBottom: '2rem', border: '1px solid var(--omen-border)' }}>
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '0.6rem 1.25rem',
                fontSize: '0.75rem',
                letterSpacing: '0.1em',
                background: activeTab === tab ? 'var(--omen-text)' : 'var(--omen-surface)',
                color: activeTab === tab ? 'var(--omen-bg)' : 'var(--omen-muted)',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                textTransform: 'uppercase',
              }}
            >
              {tab}
            </button>
          ))}
        </nav>

        {loading ? (
          <p className="muted-text">Loading...</p>
        ) : contributions.length === 0 ? (
          <p className="muted-text">No {activeTab} contributions.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'var(--omen-border)', border: '1px solid var(--omen-border)' }}>
            {contributions.map((c) => {
              const isExpanded = expanded === c.id;
              const isBeingReviewed = reviewing === c.id;

              return (
                <article key={c.id} style={{ background: 'var(--omen-surface)', padding: '1.25rem' }}>
                  <div
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer' }}
                    onClick={() => setExpanded(isExpanded ? null : c.id)}
                  >
                    <div>
                      <p style={{ fontSize: '0.7rem', color: 'var(--omen-muted)', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>
                        {c.type.replace('_', ' ')} &middot; {new Date(c.createdAt).toLocaleDateString()}
                      </p>
                      <p style={{ fontSize: '0.9rem', color: 'var(--omen-text)' }}>{c.title}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--omen-muted)', marginTop: '0.25rem', fontFamily: 'inherit' }}>
                        {c.accountNumber.slice(0, 9)}***
                        {c.companyTicker && ` · ${c.companyTicker}`}
                      </p>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--omen-muted)' }}>{isExpanded ? '▲' : '▼'}</span>
                  </div>

                  {isExpanded && (
                    <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--omen-border)', paddingTop: '1.25rem' }}>
                      <p className="body-text" style={{ fontSize: '0.85rem', lineHeight: '1.7', marginBottom: '1rem', whiteSpace: 'pre-wrap' }}>
                        {c.description}
                      </p>

                      {c.fileUrl && (
                        <p style={{ marginBottom: '1rem' }}>
                          <a
                            href={c.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: '0.8rem', color: 'var(--omen-text)' }}
                          >
                            DOCUMENT →
                          </a>
                        </p>
                      )}

                      {activeTab === 'pending' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            <div>
                              <label className="form-label" htmlFor={`quality-${c.id}`}>QUALITY</label>
                              <select
                                id={`quality-${c.id}`}
                                className="form-input"
                                value={quality}
                                onChange={(e) => setQuality(e.target.value as RewardQuality)}
                                style={{ minWidth: '120px' }}
                              >
                                {(['low', 'medium', 'high'] as RewardQuality[]).map((q) => {
                                  const range = REWARD_RANGES[c.type][q];
                                  return (
                                    <option key={q} value={q}>
                                      {q.toUpperCase()} (${range.min}–${range.max})
                                    </option>
                                  );
                                })}
                              </select>
                            </div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--omen-muted)', paddingTop: '1.2rem' }}>
                              Reward: ${calculateReward(c.type, quality)}
                            </p>
                          </div>

                          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                            <button
                              onClick={() => handleApprove(c.id, c.type)}
                              disabled={isBeingReviewed}
                              className="btn-primary"
                              style={{ fontSize: '0.8rem' }}
                            >
                              APPROVE +${calculateReward(c.type, quality)}
                            </button>

                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              <input
                                className="form-input"
                                type="text"
                                placeholder="Rejection reason (optional)"
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                maxLength={500}
                                style={{ minWidth: '220px' }}
                              />
                              <button
                                onClick={() => handleReject(c.id)}
                                disabled={isBeingReviewed}
                                className="btn-secondary"
                                style={{ fontSize: '0.8rem' }}
                              >
                                REJECT
                              </button>
                            </div>
                          </div>

                          {reviewError && (
                            <p style={{ color: '#CD853F', fontSize: '0.8rem' }}>{reviewError}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
