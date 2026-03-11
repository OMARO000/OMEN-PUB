import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Transparency Report — OMEN',
  description: 'OMEN quarterly transparency report. API usage, enforcement actions, and pattern flags.',
};

export default function TransparencyPage() {
  return (
    <div className="container" style={{ paddingTop: '3rem', paddingBottom: '5rem', maxWidth: '680px' }}>

      <p style={{ fontSize: '0.7rem', letterSpacing: '0.2em', color: 'var(--omen-muted)', marginBottom: '0.5rem' }}>
        OMARO PBC / ACCOUNTABILITY
      </p>
      <h1 style={{ fontSize: '1.4rem', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
        TRANSPARENCY REPORT
      </h1>
      <p style={{ fontSize: '0.75rem', color: 'var(--omen-muted)', marginBottom: '0.5rem' }}>
        Quarterly. Published by OMARO Public Benefit Corporation.
      </p>
      <p style={{
        display: 'inline-block',
        fontSize: '0.65rem',
        letterSpacing: '0.15em',
        color: 'var(--tag-broken-promise)',
        border: '1px solid var(--tag-broken-promise)',
        padding: '0.2rem 0.5rem',
        marginBottom: '2.5rem',
      }}>
        FIRST REPORT: Q2 2026
      </p>

      <hr style={{ borderTop: '1px solid var(--omen-border)', marginBottom: '2.5rem' }} />

      {/* Why we publish */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '0.75rem', letterSpacing: '0.2em', color: 'var(--omen-accent)', marginBottom: '0.75rem' }}>
          WHY WE PUBLISH THIS
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--omen-muted)', lineHeight: 1.75 }}>
          OMEN exists to hold corporations accountable. We apply the same standard to ourselves.
          Every API client is subject to use case review and ongoing audit. This report documents
          how that power is exercised — who has access, what they do with it, and when we revoke it.
        </p>
      </section>

      {/* Stats — placeholder */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '0.75rem', letterSpacing: '0.2em', color: 'var(--omen-accent)', marginBottom: '1rem' }}>
          CURRENT PERIOD — Q1 2026 (PENDING)
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          {[
            { label: 'TOTAL API CLIENTS', value: '—', note: 'Published Q2 2026' },
            { label: 'ACTIVE CLIENTS', value: '—', note: 'Published Q2 2026' },
            { label: 'TOTAL API CALLS', value: '—', note: 'Published Q2 2026' },
            { label: 'PATTERN FLAGS REVIEWED', value: '—', note: 'Published Q2 2026' },
            { label: 'ENFORCEMENT ACTIONS', value: '—', note: 'Terminations + suspensions' },
            { label: 'BLOCKED USE CASES', value: '—', note: 'Rejected applications' },
          ].map(({ label, value, note }) => (
            <div
              key={label}
              style={{
                border: '1px solid var(--omen-border)',
                background: 'var(--omen-surface)',
                padding: '1rem',
              }}
            >
              <p style={{ margin: '0 0 0.25rem', fontSize: '0.55rem', letterSpacing: '0.18em', color: 'var(--omen-muted)' }}>
                {label}
              </p>
              <p style={{ margin: '0 0 0.2rem', fontSize: '1.6rem', fontWeight: 700, color: 'var(--omen-text)', lineHeight: 1 }}>
                {value}
              </p>
              <p style={{ margin: 0, fontSize: '0.6rem', color: 'var(--omen-muted)' }}>
                {note}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Use case breakdown */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '0.75rem', letterSpacing: '0.2em', color: 'var(--omen-accent)', marginBottom: '0.75rem' }}>
          USE CASE BREAKDOWN
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--omen-muted)', marginBottom: '1rem', lineHeight: 1.7 }}>
          API clients are approved for specific declared use cases. The distribution will be published
          quarterly. Categories include: journalism, academic research, ESG analysis, nonprofit advocacy,
          financial research, and other approved uses.
        </p>
        <div
          style={{
            border: '1px solid var(--omen-border)',
            padding: '1rem',
            background: 'var(--omen-surface)',
            fontSize: '0.75rem',
            color: 'var(--omen-muted)',
          }}
        >
          -- USE CASE BREAKDOWN PUBLISHED Q2 2026 --
        </div>
      </section>

      {/* Terminated clients */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '0.75rem', letterSpacing: '0.2em', color: 'var(--omen-accent)', marginBottom: '0.75rem' }}>
          TERMINATED CLIENTS
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--omen-muted)', marginBottom: '1rem', lineHeight: 1.7 }}>
          Clients terminated for misuse are listed here anonymized (organization type + reason).
          Individual clients are not named unless they have made the conduct public themselves.
        </p>
        <div
          style={{
            border: '1px solid var(--omen-border)',
            padding: '1rem',
            background: 'var(--omen-surface)',
            fontSize: '0.75rem',
            color: 'var(--omen-muted)',
          }}
        >
          -- NO TERMINATIONS TO REPORT --
        </div>
      </section>

      {/* Enforcement principles */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '0.75rem', letterSpacing: '0.2em', color: 'var(--omen-accent)', marginBottom: '0.75rem' }}>
          ENFORCEMENT PRINCIPLES
        </h2>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[
            'Use case review is manual. No automated approvals for high-risk categories.',
            'Pattern flags are reviewed within 5 business days of trigger.',
            'Termination decisions are made by OMARO PBC leadership and are logged permanently.',
            'Terminated clients may appeal in writing within 30 days.',
            'Law enforcement requests are handled in accordance with applicable law and disclosed in this report where legally permissible.',
          ].map((principle, i) => (
            <div
              key={i}
              style={{
                borderLeft: '2px solid var(--omen-border)',
                paddingLeft: '0.85rem',
                fontSize: '0.75rem',
                color: 'var(--omen-muted)',
                lineHeight: 1.6,
              }}
            >
              {principle}
            </div>
          ))}
        </div>
      </section>

      <p style={{ fontSize: '0.7rem', color: 'var(--omen-muted)', borderTop: '1px solid var(--omen-border)', paddingTop: '1.5rem' }}>
        Questions about this report: legal@omaro.pub
      </p>

    </div>
  );
}
