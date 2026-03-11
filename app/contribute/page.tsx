'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { REWARD_RANGES, formatRewardRange } from '@/lib/contributions/rewards';
import type { ContributionType } from '@/db/schema';

const TYPE_META: Record<ContributionType, { label: string; description: string }> = {
  BREACH_REPORT: {
    label: 'BREACH REPORT',
    description:
      'Document a corporate violation, data breach, regulatory infraction, or misconduct incident with supporting evidence.',
  },
  POLICY_CHANGE: {
    label: 'POLICY CHANGE',
    description:
      'Record a material change to a corporate policy, terms of service, or public commitment.',
  },
  COURT_DOCUMENT: {
    label: 'COURT DOCUMENT',
    description:
      'Upload a publicly available court filing, lawsuit, settlement, or regulatory order.',
  },
  TRANSLATION: {
    label: 'TRANSLATION',
    description:
      'Translate a foreign-language document into English for inclusion in the public record.',
  },
  OCA_CONTRIBUTION: {
    label: 'OCA CONTRIBUTION',
    description:
      'Submit an ethical alternative to an OMEN-tracked corporation for the OMEN Crowdsourced Alternatives directory.',
  },
};

export default function ContributePage() {
  const [isPaid, setIsPaid] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/verify-account')
      .then((r) => {
        if (!r.ok) { setIsPaid(null); return; }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        // We need to check isPaid — re-verify with account info
        setIsPaid(true); // session exists; check payment via dashboard endpoint
      })
      .catch(() => setIsPaid(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main id="main-content" className="page-container">
        <p className="muted-text">Loading...</p>
      </main>
    );
  }

  if (isPaid === null) {
    return (
      <main id="main-content" className="page-container">
        <section aria-labelledby="contribute-heading">
          <h1 id="contribute-heading" className="page-title">DATA CO-OP</h1>
          <p className="body-text" style={{ marginBottom: '2rem' }}>
            Contribute to the public record. Earn rewards. Withdraw in privacy-preserving currency.
          </p>
          <div
            style={{
              border: '1px solid var(--omen-border)',
              padding: '2rem',
              background: 'var(--omen-surface)',
            }}
          >
            <p className="body-text" style={{ marginBottom: '1rem' }}>
              You must be logged in to contribute.
            </p>
            <Link href="/dashboard" className="btn-primary">
              ACCESS DASHBOARD →
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main id="main-content" className="page-container">
      <section aria-labelledby="contribute-heading">
        <h1 id="contribute-heading" className="page-title">DATA CO-OP</h1>
        <p className="body-text" style={{ marginBottom: '0.5rem' }}>
          Contribute to the public record. Earnings accumulate in your bonus balance and can be
          withdrawn in Monero or USDC.
        </p>
        <p className="muted-text" style={{ marginBottom: '3rem', fontSize: '0.85rem' }}>
          All submissions are reviewed before rewards are issued. Reward amounts depend on quality
          and impact.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '1px',
            background: 'var(--omen-border)',
            border: '1px solid var(--omen-border)',
          }}
        >
          {(Object.keys(TYPE_META) as ContributionType[]).map((type) => {
            const meta = TYPE_META[type];
            return (
              <article
                key={type}
                style={{
                  background: 'var(--omen-surface)',
                  padding: '1.5rem',
                }}
              >
                <h2
                  style={{
                    fontSize: '0.8rem',
                    letterSpacing: '0.12em',
                    color: 'var(--omen-text)',
                    marginBottom: '0.75rem',
                  }}
                >
                  {meta.label}
                </h2>
                <p
                  className="muted-text"
                  style={{ fontSize: '0.85rem', marginBottom: '1.25rem', lineHeight: '1.6' }}
                >
                  {meta.description}
                </p>
                <p
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--omen-muted)',
                    marginBottom: '1rem',
                    fontFamily: 'inherit',
                  }}
                >
                  REWARD: {formatRewardRange(type)}
                </p>
                <Link
                  href={`/contribute/${type.toLowerCase()}`}
                  className="btn-primary"
                  style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
                >
                  SUBMIT →
                </Link>
              </article>
            );
          })}
        </div>

        <div style={{ marginTop: '3rem', borderTop: '1px solid var(--omen-border)', paddingTop: '2rem' }}>
          <h2 style={{ fontSize: '0.85rem', letterSpacing: '0.1em', marginBottom: '1rem' }}>
            HOW REWARDS WORK
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem' }}>
            {[
              { step: '01', text: 'Submit a contribution with supporting evidence.' },
              { step: '02', text: 'OMEN staff review for accuracy and completeness.' },
              { step: '03', text: 'Approved submissions earn a bonus balance credit.' },
              { step: '04', text: 'Withdraw $10+ via Monero or USDC — no KYC required.' },
            ].map(({ step, text }) => (
              <div key={step}>
                <p style={{ fontSize: '0.7rem', color: 'var(--omen-muted)', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
                  STEP {step}
                </p>
                <p className="body-text" style={{ fontSize: '0.85rem' }}>{text}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: '2rem' }}>
          <Link href="/dashboard/earnings" className="btn-secondary" style={{ fontSize: '0.8rem' }}>
            VIEW EARNINGS →
          </Link>
        </div>
      </section>
    </main>
  );
}
