'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { ExposureResult } from '@/lib/dashboard/calculateExposure';

const CATEGORY_LABELS: Record<string, string> = {
  PRI: 'PRIVACY',
  LAB: 'LABOR',
  ETH: 'ETHICS',
  ENV: 'ENVIRONMENT',
  ANT: 'ANTITRUST',
};

const CATEGORY_COLORS: Record<string, string> = {
  PRI: '#7eb8d4',
  LAB: '#d4a76a',
  ETH: '#c47eb8',
  ENV: '#7eb87e',
  ANT: '#d47e7e',
};

function formatDollars(n: number): string {
  if (n === 0) return '$0';
  return '$' + Math.round(n).toLocaleString('en-US');
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activated = searchParams.get('activated') === 'true';

  const [exposure, setExposure] = useState<ExposureResult | null>(null);
  const [isPaid, setIsPaid] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const sessionRes = await fetch('/api/auth/verify-account');
      if (sessionRes.status === 401) {
        router.replace('/dashboard/login');
        return;
      }

      const sessionData = await sessionRes.json();
      setIsPaid(sessionData.isPaid ?? false);

      const expRes = await fetch('/api/dashboard/exposure');
      if (expRes.ok) {
        setExposure(await expRes.json());
      }

      setLoading(false);
    }

    load();
  }, [router]);

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: '3rem' }}>
        <p style={{ fontSize: '0.7rem', color: 'var(--omen-muted)', letterSpacing: '0.15em' }}>
          LOADING...
        </p>
      </div>
    );
  }

  const hasCompanies = (exposure?.trackedTickers?.length ?? 0) > 0;

  return (
    <div className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem', maxWidth: '680px' }}>
      <p style={{ fontSize: '0.7rem', letterSpacing: '0.2em', color: 'var(--omen-muted)', marginBottom: '0.5rem' }}>
        OMARO PBC / OMEN
      </p>
      <h1 style={{ fontSize: '1.4rem', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
        YOUR EXPOSURE
      </h1>
      <p style={{ fontSize: '0.75rem', color: 'var(--omen-muted)', marginBottom: '2rem' }}>
        Documented violations by the companies you use.
      </p>

      <hr className="divider" style={{ marginBottom: '2rem' }} />

      {/* Activation confirmation */}
      {activated && (
        <div style={{
          border: '1px solid var(--omen-accent)',
          padding: '0.75rem 1rem',
          marginBottom: '1.5rem',
          fontSize: '0.75rem',
          color: 'var(--omen-accent)',
          letterSpacing: '0.08em',
        }}>
          — ACCOUNT ACTIVATED. WELCOME.
        </div>
      )}

      {/* Payment prompt */}
      {isPaid === false && (
        <div style={{
          border: '1px solid var(--omen-border)',
          background: 'var(--omen-surface)',
          padding: '1.25rem',
          marginBottom: '2rem',
        }}>
          <p style={{ margin: '0 0 0.4rem', fontSize: '0.6rem', letterSpacing: '0.15em', color: 'var(--omen-muted)' }}>
            ACCOUNT NOT ACTIVE
          </p>
          <p style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: 'var(--omen-text)', lineHeight: 1.6 }}>
            Activate your account to unlock full access — $2/month.
          </p>
          <Link
            href="/dashboard/pay"
            style={{
              display: 'inline-block',
              padding: '0.5rem 1.25rem',
              border: '1px solid var(--omen-accent)',
              color: 'var(--omen-accent)',
              fontSize: '0.75rem',
              letterSpacing: '0.15em',
              textDecoration: 'none',
            }}
          >
            ACTIVATE FOR $2/MONTH →
          </Link>
        </div>
      )}

      {/* Empty state */}
      {!hasCompanies && (
        <div style={{ marginBottom: '2rem' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--omen-muted)', marginBottom: '1.5rem' }}>
            -- YOU ARE NOT TRACKING ANY COMPANIES. --
          </p>
          <Link
            href="/dashboard/onboarding"
            style={{
              display: 'inline-block',
              padding: '0.6rem 1.25rem',
              border: '1px solid var(--omen-border)',
              color: 'var(--omen-text)',
              fontSize: '0.75rem',
              letterSpacing: '0.15em',
              textDecoration: 'none',
            }}
          >
            TRACK COMPANIES →
          </Link>
        </div>
      )}

      {/* Exposure data */}
      {hasCompanies && exposure && (
        <>
          {/* Top-line numbers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '2rem',
            marginBottom: '2.5rem',
          }}>
            <div>
              <p style={{ margin: '0 0 0.25rem', fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--omen-muted)' }}>
                TOTAL VIOLATIONS
              </p>
              <p style={{
                margin: 0,
                fontSize: '3rem',
                fontWeight: 700,
                color: 'var(--omen-text)',
                lineHeight: 1,
                letterSpacing: '-0.02em',
              }}>
                {exposure.totalViolations.toLocaleString('en-US')}
              </p>
            </div>
            <div>
              <p style={{ margin: '0 0 0.25rem', fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--omen-muted)' }}>
                DOCUMENTED FINES
              </p>
              <p style={{
                margin: 0,
                fontSize: '3rem',
                fontWeight: 700,
                color: 'var(--omen-text)',
                lineHeight: 1,
                letterSpacing: '-0.02em',
              }}>
                {formatDollars(exposure.totalFines)}
              </p>
            </div>
          </div>

          {/* By category */}
          <div style={{ marginBottom: '2.5rem' }}>
            <p style={{ margin: '0 0 0.75rem', fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--omen-muted)' }}>
              BY CATEGORY
            </p>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              {(Object.entries(exposure.byCategory) as [string, number][]).map(([cat, n]) => (
                <div key={cat}>
                  <p style={{ margin: '0 0 0.15rem', fontSize: '0.6rem', letterSpacing: '0.1em', color: CATEGORY_COLORS[cat] ?? 'var(--omen-muted)' }}>
                    {CATEGORY_LABELS[cat] ?? cat}
                  </p>
                  <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--omen-text)' }}>
                    {n}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Company list */}
          <div style={{ marginBottom: '2.5rem' }}>
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--omen-muted)' }}>
              TRACKED COMPANIES
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '70px 1fr 80px 120px',
              gap: '1rem',
              padding: '0.3rem 0',
              borderBottom: '1px solid var(--omen-border)',
              fontSize: '0.55rem',
              letterSpacing: '0.15em',
              color: 'var(--omen-muted)',
            }}>
              <span>TICKER</span>
              <span>COMPANY</span>
              <span style={{ textAlign: 'right' }}>VIOLATIONS</span>
              <span style={{ textAlign: 'right' }}>FINES</span>
            </div>

            {exposure.companies.map((co) => (
              <div
                key={co.ticker}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '70px 1fr 80px 120px',
                  gap: '1rem',
                  padding: '0.65rem 0',
                  borderBottom: '1px solid var(--omen-border)',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: '0.7rem', color: 'var(--omen-accent)', fontWeight: 700, letterSpacing: '0.05em' }}>
                  {co.ticker}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--omen-text)' }}>
                  {co.name}
                </span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--omen-text)', textAlign: 'right' }}>
                  {co.violationCount}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--omen-muted)', textAlign: 'right' }}>
                  {formatDollars(co.totalFines)}
                </span>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <Link
              href={isPaid ? '/oca' : '/dashboard/pay'}
              style={{
                display: 'inline-block',
                padding: '0.6rem 1.25rem',
                border: '1px solid var(--omen-accent)',
                color: 'var(--omen-accent)',
                fontSize: '0.75rem',
                letterSpacing: '0.15em',
                textDecoration: 'none',
              }}
            >
              FIND ALTERNATIVES →
            </Link>
            <Link
              href="/dashboard/onboarding"
              style={{
                display: 'inline-block',
                padding: '0.6rem 1.25rem',
                border: '1px solid var(--omen-border)',
                color: 'var(--omen-text)',
                fontSize: '0.75rem',
                letterSpacing: '0.15em',
                textDecoration: 'none',
              }}
            >
              TRACK MORE COMPANIES
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardContent />
    </Suspense>
  );
}
