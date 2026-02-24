import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Legal Battles',
  description: 'Tracking legal attacks on OMEN and OMARO Public Benefit Corporation.',
};

export default function LegalBattlesPage() {
  return (
    <div className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem' }}>
      <header style={{ marginBottom: '2.5rem' }}>
        <p style={{ color: 'var(--omen-muted)', fontSize: '0.8rem', letterSpacing: '0.15em', marginBottom: '0.75rem' }}>
          LEGAL RECORD
        </p>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Legal Battles</h1>
        <p style={{ color: 'var(--omen-muted)', maxWidth: '600px' }}>
          Every legal action taken against OMEN or OMARO PBC is documented here.
          Attempts to silence the record become part of the record.
        </p>
      </header>

      <hr className="divider" />

      <section aria-labelledby="active-heading" style={{ marginBottom: '3rem' }}>
        <h2 id="active-heading" style={{ fontSize: '1rem', letterSpacing: '0.1em', marginBottom: '1rem' }}>
          ACTIVE CASES
        </h2>
        <p style={{ color: 'var(--omen-muted)', fontStyle: 'italic' }}>
          No active legal cases on record.
        </p>
      </section>

      <section aria-labelledby="resolved-heading">
        <h2 id="resolved-heading" style={{ fontSize: '1rem', letterSpacing: '0.1em', marginBottom: '1rem' }}>
          RESOLVED CASES
        </h2>
        <p style={{ color: 'var(--omen-muted)', fontStyle: 'italic' }}>
          No resolved cases on record.
        </p>
      </section>
    </div>
  );
}
