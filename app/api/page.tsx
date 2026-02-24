import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'API Documentation',
  description: 'OMEN public API — access the corporate accountability ledger programmatically.',
};

const PLANNED_ENDPOINTS = [
  { method: 'GET', path: '/api/v1/companies', description: 'List all tracked companies' },
  { method: 'GET', path: '/api/v1/companies/:slug', description: 'Get company profile and ledger summary' },
  { method: 'GET', path: '/api/v1/blocks', description: 'List ledger entries, filterable by company and tag' },
  { method: 'GET', path: '/api/v1/blocks/:id', description: 'Get a single ledger entry with documents' },
  { method: 'POST', path: '/api/v1/blocks', description: 'Submit a new entry for review (auth required)' },
  { method: 'GET', path: '/api/v1/legal-battles', description: 'List active legal attacks on OMEN' },
];

export default function APIDocsPage() {
  return (
    <div className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem' }}>
      <header style={{ marginBottom: '2.5rem' }}>
        <p style={{ color: 'var(--omen-muted)', fontSize: '0.8rem', letterSpacing: '0.15em', marginBottom: '0.75rem' }}>
          DEVELOPER REFERENCE
        </p>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>API Documentation</h1>
        <p style={{ color: 'var(--omen-muted)', maxWidth: '600px' }}>
          Programmatic access to the OMEN ledger. All public data is freely accessible.
          Write access requires an API key.
        </p>
      </header>

      <hr className="divider" />

      <section aria-labelledby="status-heading" style={{ marginBottom: '3rem' }}>
        <h2 id="status-heading" style={{ fontSize: '1rem', letterSpacing: '0.1em', marginBottom: '1rem' }}>
          STATUS
        </h2>
        <p style={{ color: 'var(--omen-muted)' }}>
          API endpoints are not yet live. The following table reflects the planned v1 surface.
        </p>
      </section>

      <section aria-labelledby="endpoints-heading" style={{ marginBottom: '3rem' }}>
        <h2 id="endpoints-heading" style={{ fontSize: '1rem', letterSpacing: '0.1em', marginBottom: '1.5rem' }}>
          PLANNED ENDPOINTS
        </h2>
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.875rem',
            }}
          >
            <thead>
              <tr style={{ borderBottom: '1px solid var(--omen-border)' }}>
                <th style={{ textAlign: 'left', padding: '0.5rem 1rem 0.5rem 0', color: 'var(--omen-muted)', fontWeight: 400, letterSpacing: '0.05em' }}>
                  METHOD
                </th>
                <th style={{ textAlign: 'left', padding: '0.5rem 1rem', color: 'var(--omen-muted)', fontWeight: 400, letterSpacing: '0.05em' }}>
                  PATH
                </th>
                <th style={{ textAlign: 'left', padding: '0.5rem 0 0.5rem 1rem', color: 'var(--omen-muted)', fontWeight: 400, letterSpacing: '0.05em' }}>
                  DESCRIPTION
                </th>
              </tr>
            </thead>
            <tbody>
              {PLANNED_ENDPOINTS.map(({ method, path, description }) => (
                <tr
                  key={path}
                  style={{ borderBottom: '1px solid var(--omen-border)' }}
                >
                  <td style={{ padding: '0.75rem 1rem 0.75rem 0', color: 'var(--omen-muted)', whiteSpace: 'nowrap' }}>
                    {method}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <code style={{ fontSize: '0.8rem' }}>{path}</code>
                  </td>
                  <td style={{ padding: '0.75rem 0 0.75rem 1rem', color: 'var(--omen-muted)' }}>
                    {description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="auth-heading">
        <h2 id="auth-heading" style={{ fontSize: '1rem', letterSpacing: '0.1em', marginBottom: '1rem' }}>
          AUTHENTICATION
        </h2>
        <p style={{ color: 'var(--omen-muted)', maxWidth: '480px', lineHeight: 1.7 }}>
          API key issuance is not yet available. Keys will be scoped to read or
          read-write access. All requests are logged for audit purposes.
        </p>
      </section>
    </div>
  );
}
