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
          <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 3rem)', marginBottom: '1.5rem' }}>
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
            <Link href="/ledger" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '480px', padding: '0.75rem 1rem', border: '1px solid var(--omen-border)', textDecoration: 'none', letterSpacing: '0.05em' }}>
              <span>VIEW LEDGER &gt;</span>
              <span style={{ color: 'var(--omen-muted)', fontSize: '0.875rem' }}>All records</span>
            </Link>
            <Link href="/legal-battles" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '480px', padding: '0.75rem 1rem', border: '1px solid var(--omen-border)', textDecoration: 'none', letterSpacing: '0.05em' }}>
              <span>LEGAL BATTLES &gt;</span>
              <span style={{ color: 'var(--omen-muted)', fontSize: '0.875rem' }}>Attacks on OMEN</span>
            </Link>
            <Link href="/about" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '480px', padding: '0.75rem 1rem', border: '1px solid var(--omen-border)', textDecoration: 'none', letterSpacing: '0.05em' }}>
              <span>ABOUT &gt;</span>
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
      </article>
    </div>
  );
}
