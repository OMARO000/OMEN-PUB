import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'OMEN — Corporate Accountability Intelligence',
};

export default function HomePage() {
  return (
    <div className="container" style={{ paddingTop: '4rem', paddingBottom: '4rem' }}>
      <article>
        <header style={{ marginBottom: '3rem' }}>
          <p style={{ color: 'var(--omen-muted)', fontSize: '0.8rem', letterSpacing: '0.15em', marginBottom: '1rem' }}>
            OMARO PUBLIC BENEFIT CORPORATION
          </p>
          <h1 style={{ fontSize: 'clamp(1rem, 2vw, 1.4rem)', fontWeight: 400, marginBottom: '1.5rem', letterSpacing: '0.02em' }}>
            The permanent record of corporate conduct.
          </h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--omen-muted)', maxWidth: '600px', lineHeight: 1.7 }}>
            OMEN documents what corporations do — not what they say. Every broken promise,
            every harmful act, every policy that harmed people. Immutable. Searchable.
            Accountable.
          </p>
        </header>

        <hr className="divider" />

        <section aria-labelledby="mission-heading" style={{ marginBottom: '3rem' }}>
          <h2 id="mission-heading" style={{ fontSize: '1rem', letterSpacing: '0.1em', marginBottom: '1rem' }}>
            MISSION
          </h2>
          <p style={{ maxWidth: '600px', color: 'var(--omen-muted)' }}>
            Corporations operate in the dark because no one keeps score. OMEN changes that.
            We build and maintain a structured, verifiable ledger of corporate behavior —
            indexed by company, tagged by impact, open to the public.
          </p>
        </section>

        <section aria-labelledby="start-heading" style={{ marginBottom: '3rem' }}>
          <h2 id="start-heading" style={{ fontSize: '1rem', letterSpacing: '0.1em', marginBottom: '1.5rem' }}>
            START HERE
          </h2>
          <nav aria-label="Quick links" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Link href="/ledger" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '480px', padding: '0.75rem 1rem', border: '1px solid var(--omen-border)', background: 'var(--omen-surface)', textDecoration: 'none', letterSpacing: '0.05em', color: 'var(--omen-text)' }}>
              <span>[ view ledger ]</span>
              <span style={{ color: 'var(--omen-muted)', fontSize: '0.875rem' }}>All records</span>
            </Link>
            <Link href="/legal-battles" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '480px', padding: '0.75rem 1rem', border: '1px solid var(--omen-border)', background: 'var(--omen-surface)', textDecoration: 'none', letterSpacing: '0.05em', color: 'var(--omen-text)' }}>
              <span>[ legal battles ]</span>
              <span style={{ color: 'var(--omen-muted)', fontSize: '0.875rem' }}>Attacks on OMEN</span>
            </Link>
            <Link href="/about" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '480px', padding: '0.75rem 1rem', border: '1px solid var(--omen-border)', background: 'var(--omen-surface)', textDecoration: 'none', letterSpacing: '0.05em', color: 'var(--omen-text)' }}>
              <span>[ about ]</span>
              <span style={{ color: 'var(--omen-muted)', fontSize: '0.875rem' }}>Who we are</span>
            </Link>
          </nav>
        </section>

        <section aria-labelledby="tags-heading">
          <h2 id="tags-heading" style={{ fontSize: '1rem', letterSpacing: '0.1em', marginBottom: '1rem' }}>
            VIOLATION CLASSIFICATION
          </h2>
          <dl style={{ display: 'grid', gap: '0.5rem', maxWidth: '480px' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'baseline' }}>
              <dt style={{ fontWeight: 700, color: 'var(--tag-ugly)', minWidth: '160px' }}>UGLY</dt>
              <dd style={{ margin: 0, color: 'var(--omen-muted)', fontSize: '0.875rem' }}>Egregious harm or abuse</dd>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'baseline' }}>
              <dt style={{ fontWeight: 700, color: 'var(--tag-broken-promise)', minWidth: '160px' }}>BROKEN PROMISE</dt>
              <dd style={{ margin: 0, color: 'var(--omen-muted)', fontSize: '0.875rem' }}>Public commitment, not kept</dd>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'baseline' }}>
              <dt style={{ fontWeight: 700, color: 'var(--tag-bad)', minWidth: '160px' }}>BAD</dt>
              <dd style={{ margin: 0, color: 'var(--omen-muted)', fontSize: '0.875rem' }}>Harmful but common conduct</dd>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'baseline' }}>
              <dt style={{ fontWeight: 700, color: 'var(--tag-questionable)', minWidth: '160px' }}>QUESTIONABLE</dt>
              <dd style={{ margin: 0, color: 'var(--omen-muted)', fontSize: '0.875rem' }}>Under investigation or alleged</dd>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'baseline' }}>
              <dt style={{ fontWeight: 700, color: 'var(--tag-good)', minWidth: '160px' }}>GOOD</dt>
              <dd style={{ margin: 0, color: 'var(--omen-muted)', fontSize: '0.875rem' }}>Verified positive action</dd>
            </div>
          </dl>
        </section>

        <section style={{
          marginTop: '48px',
          paddingTop: '32px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}>
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--omen-accent)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: '12px',
          }}>
            [HAI STANDARD]
          </p>
          <p style={{
            fontSize: '15px',
            color: 'rgba(255,255,255,0.85)',
            lineHeight: 1.7,
            marginBottom: '8px',
          }}>
            OMEN is built to the HAI Standard.
          </p>
          <p style={{
            fontSize: '13px',
            color: 'rgba(255,255,255,0.45)',
            lineHeight: 1.7,
            marginBottom: '20px',
          }}>
            The HAI Standard holds AI systems accountable to human values. OMEN is
            one of the first platforms built to meet it. If that matters to you,
            support the standard that makes tools like this possible.
          </p>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <a
              href="https://haiproject.xyz"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                color: 'var(--omen-accent)',
                textDecoration: 'none',
                letterSpacing: '0.06em',
                border: '1px solid var(--omen-accent)',
                padding: '8px 16px',
                borderRadius: '4px',
              }}
            >
              [learn about the HAI Standard →]
            </a>
            <a
              href="https://haiproject.xyz/#pledge"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                color: 'rgba(255,255,255,0.4)',
                textDecoration: 'none',
                letterSpacing: '0.06em',
                border: '1px solid rgba(255,255,255,0.15)',
                padding: '8px 16px',
                borderRadius: '4px',
              }}
            >
              [take the pledge →]
            </a>
          </div>
        </section>
      </article>
    </div>
  );
}
