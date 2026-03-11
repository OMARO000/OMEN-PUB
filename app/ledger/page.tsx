import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ledger',
  description: 'The public ledger of corporate conduct, maintained by OMARO PBC.',
};

export default function LedgerPage() {
  return (
    <div className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem' }}>
      <header style={{ marginBottom: '2.5rem' }}>
        <p style={{ color: 'var(--omen-muted)', fontSize: '0.8rem', letterSpacing: '0.15em', marginBottom: '0.75rem' }}>
          PUBLIC RECORD
        </p>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>The Ledger</h1>
        <p style={{ color: 'var(--omen-muted)', maxWidth: '600px' }}>
          Every verified act of corporate conduct — indexed, classified, and permanent.
        </p>
      </header>

      <hr className="divider" />

      <section aria-label="Ledger filters" style={{ marginBottom: '2rem' }}>
        <p style={{ color: 'var(--omen-muted)', fontSize: '0.875rem' }}>
          Filter by company, date, or violation classification — coming in Phase 2.
        </p>
      </section>

      <section aria-label="Ledger entries">
        <p style={{ color: 'var(--omen-muted)', fontSize: '0.875rem' }}>
          -- No records. The ledger will populate as data is entered.
        </p>
      </section>
    </div>
  );
}
