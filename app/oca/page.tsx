import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'OCA — Open Corporate Accountability',
  description: 'Open Corporate Accountability tool — search and verify corporate conduct.',
};

export default function OCAPage() {
  return (
    <div className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem' }}>
      <header style={{ marginBottom: '2.5rem' }}>
        <p style={{ color: 'var(--omen-muted)', fontSize: '0.8rem', letterSpacing: '0.15em', marginBottom: '0.75rem' }}>
          OPEN CORPORATE ACCOUNTABILITY
        </p>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>OCA</h1>
        <p style={{ color: 'var(--omen-muted)', maxWidth: '600px' }}>
          Look up any company. See what the record says.
        </p>
      </header>

      <hr className="divider" />

      <section aria-labelledby="search-heading" style={{ marginBottom: '3rem' }}>
        <h2 id="search-heading" style={{ fontSize: '1rem', letterSpacing: '0.1em', marginBottom: '1rem' }}>
          COMPANY SEARCH
        </h2>
        <p style={{ color: 'var(--omen-muted)', maxWidth: '480px', lineHeight: 1.7 }}>
          Company search and accountability scoring coming in Phase 2.
        </p>
      </section>

      <section aria-labelledby="how-heading">
        <h2 id="how-heading" style={{ fontSize: '1rem', letterSpacing: '0.1em', marginBottom: '1rem' }}>
          HOW IT WORKS
        </h2>
        <ol style={{ color: 'var(--omen-muted)', paddingLeft: '1.25rem', lineHeight: 2, maxWidth: '480px' }}>
          <li>Search for a company by name or industry</li>
          <li>Review their ledger entries, classified by violation type</li>
          <li>See verified alternatives and what others have done</li>
          <li>Contribute a correction or new record</li>
        </ol>
      </section>
    </div>
  );
}
