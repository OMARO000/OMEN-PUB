import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About',
  description: 'About OMARO Public Benefit Corporation and the OMEN project.',
};

export default function AboutPage() {
  return (
    <div className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem' }}>
      <article>
        <header style={{ marginBottom: '2.5rem' }}>
          <p style={{ color: 'var(--omen-muted)', fontSize: '0.8rem', letterSpacing: '0.15em', marginBottom: '0.75rem' }}>
            ABOUT
          </p>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--omen-text)' }}>OMARO Public Benefit Corporation</h1>
          <p style={{ color: 'var(--omen-muted)', maxWidth: '600px' }}>
            We exist to hold corporations accountable through permanent, public, structured records.
          </p>
        </header>

        <hr className="divider" />

        <section aria-labelledby="mission-heading" style={{ marginBottom: '3rem' }}>
          <h2 id="mission-heading" style={{ fontSize: '1rem', letterSpacing: '0.1em', marginBottom: '1rem' }}>
            MISSION
          </h2>
          <p style={{ maxWidth: '600px', color: 'var(--omen-muted)', lineHeight: 1.7, fontSize: '0.875rem' }}>
            -- Mission statement content coming in a future phase.
          </p>
        </section>

        <section aria-labelledby="structure-heading" style={{ marginBottom: '3rem' }}>
          <h2 id="structure-heading" style={{ fontSize: '1rem', letterSpacing: '0.1em', marginBottom: '1rem' }}>
            CORPORATE STRUCTURE
          </h2>
          <p style={{ maxWidth: '600px', color: 'var(--omen-muted)', lineHeight: 1.7, fontSize: '0.875rem' }}>
            -- Legal entity details coming in a future phase.
          </p>
        </section>

        <section aria-labelledby="contact-heading">
          <h2 id="contact-heading" style={{ fontSize: '1rem', letterSpacing: '0.1em', marginBottom: '1rem' }}>
            CONTACT
          </h2>
          <p style={{ maxWidth: '600px', color: 'var(--omen-muted)', lineHeight: 1.7, fontSize: '0.875rem' }}>
            -- Contact information coming in a future phase.
          </p>
        </section>
      </article>
    </div>
  );
}
