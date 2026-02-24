import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Contributor dashboard for OMEN.',
};

export default function DashboardPage() {
  return (
    <div className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem' }}>
      <header style={{ marginBottom: '2.5rem' }}>
        <p style={{ color: 'var(--omen-muted)', fontSize: '0.8rem', letterSpacing: '0.15em', marginBottom: '0.75rem' }}>
          CONTRIBUTOR ACCESS
        </p>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Dashboard</h1>
        <p style={{ color: 'var(--omen-muted)', maxWidth: '600px' }}>
          Submit records, track contributions, and manage your account.
        </p>
      </header>

      <hr className="divider" />

      <section aria-labelledby="auth-notice-heading" style={{ marginBottom: '3rem' }}>
        <h2 id="auth-notice-heading" style={{ fontSize: '1rem', letterSpacing: '0.1em', marginBottom: '1rem' }}>
          AUTHENTICATION REQUIRED
        </h2>
        <p style={{ color: 'var(--omen-muted)', maxWidth: '480px', lineHeight: 1.7 }}>
          Dashboard access requires an OMEN account number. Account creation is not
          yet available — authentication ships in Phase 5.
        </p>
      </section>

      <section aria-labelledby="features-heading">
        <h2 id="features-heading" style={{ fontSize: '1rem', letterSpacing: '0.1em', marginBottom: '1rem' }}>
          PLANNED FEATURES
        </h2>
        <ul style={{ color: 'var(--omen-muted)', paddingLeft: '1.25rem', lineHeight: 2 }}>
          <li>Submit new ledger entries for review</li>
          <li>Track status of staged submissions</li>
          <li>Contribution history</li>
          <li>API key management</li>
        </ul>
      </section>
    </div>
  );
}
