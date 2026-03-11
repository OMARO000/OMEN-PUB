import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'API Documentation — OMEN',
  description: 'OMEN B2B API documentation. Access the corporate accountability ledger programmatically.',
};

const SECTION: React.CSSProperties = { marginBottom: '3rem' };
const H2: React.CSSProperties = { fontSize: '0.8rem', letterSpacing: '0.2em', color: 'var(--omen-accent)', marginBottom: '1rem' };
const H3: React.CSSProperties = { fontSize: '0.75rem', letterSpacing: '0.15em', color: 'var(--omen-text)', marginBottom: '0.5rem' };
const P: React.CSSProperties = { fontSize: '0.8rem', color: 'var(--omen-muted)', lineHeight: 1.75, marginBottom: '0.75rem' };
const CODE: React.CSSProperties = {
  display: 'block',
  background: 'var(--omen-surface)',
  border: '1px solid var(--omen-border)',
  padding: '0.75rem 1rem',
  fontSize: '0.75rem',
  color: 'var(--omen-text)',
  lineHeight: 1.7,
  marginBottom: '1rem',
  whiteSpace: 'pre',
  overflowX: 'auto',
};
const INLINE: React.CSSProperties = {
  background: 'var(--omen-surface)',
  border: '1px solid var(--omen-border)',
  padding: '0.1rem 0.4rem',
  fontSize: '0.72rem',
  color: 'var(--omen-accent)',
};
const DIVIDER: React.CSSProperties = { borderTop: '1px solid var(--omen-border)', marginBottom: '2.5rem' };

export default function ApiDocsPage() {
  return (
    <div className="container" style={{ paddingTop: '3rem', paddingBottom: '5rem', maxWidth: '760px' }}>

      <p style={{ fontSize: '0.7rem', letterSpacing: '0.2em', color: 'var(--omen-muted)', marginBottom: '0.5rem' }}>
        OMARO PBC / OMEN API
      </p>
      <h1 style={{ fontSize: '1.4rem', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
        API DOCUMENTATION
      </h1>
      <p style={{ fontSize: '0.75rem', color: 'var(--omen-muted)', marginBottom: '0.75rem' }}>
        Version 1.0 — Base URL: <code style={INLINE}>https://omen.pub/api/v1</code>
      </p>
      <p style={{ fontSize: '0.75rem', marginBottom: '2.5rem' }}>
        <Link href="/api-docs/pricing" style={{ color: 'var(--omen-accent)', textDecoration: 'none', letterSpacing: '0.08em' }}>
          VIEW PRICING & TIERS →
        </Link>
      </p>

      <hr style={DIVIDER} />

      {/* Authentication */}
      <section style={SECTION}>
        <h2 style={H2}>1. AUTHENTICATION</h2>
        <p style={P}>
          All requests require a Bearer token in the <code style={{ ...INLINE, display: 'inline' }}>Authorization</code> header.
          API keys are issued by OMARO PBC after use case review. Keys are shown once at issuance and cannot be retrieved.
        </p>
        <code style={CODE}>{`Authorization: Bearer omen_YOUR_API_KEY_HERE`}</code>
        <p style={P}>
          A <code style={{ ...INLINE, display: 'inline' }}>use_case</code> query parameter is required on search endpoints.
          This is logged with every request as part of the accountability system.
        </p>
        <code style={CODE}>{`GET /api/v1/violations/search?q=privacy&use_case=journalism`}</code>
      </section>

      {/* Endpoints */}
      <section style={SECTION}>
        <h2 style={H2}>2. ENDPOINTS</h2>

        {/* search */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={H3}>GET /violations/search</h3>
          <p style={P}>Search the violation ledger. All tiers.</p>
          <code style={CODE}>{`Parameters:
  q          string   Search term (title, summary)
  company    string   Ticker symbol (e.g. META)
  category   string   PRI | LAB | ETH | ENV | ANT
  severity   string   GOOD | BAD | UGLY | BROKEN_PROMISE | QUESTIONABLE
  use_case   string   REQUIRED. Declared purpose of this query
  page       integer  Default: 1
  limit      integer  Default: 20, max: 100`}</code>
          <code style={CODE}>{`{
  "data": {
    "results": [{ "blockId": "OM-2023-PRI-META-001", "title": "...", ... }],
    "pagination": { "page": 1, "limit": 20, "total": 47, "pages": 3 },
    "technicality_flag": false
  },
  "_omen": { "exportedBy": "Acme Corp", "watermark": "OMEN-a1b2c3d4-...", ... }
}`}</code>
        </div>

        {/* single block */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={H3}>GET /violations/:id</h3>
          <p style={P}>Retrieve a single violation block by ID. All tiers.</p>
          <code style={CODE}>{`GET /api/v1/violations/OM-2023-PRI-META-001`}</code>
        </div>

        {/* company profile */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={H3}>GET /companies/:ticker</h3>
          <p style={P}>Company profile with violation summary. STARTER and above.</p>
          <code style={CODE}>{`GET /api/v1/companies/META

Response includes:
  name, ticker, violationCount, violationCountByCategory,
  totalFines, mostRecentViolation, severityBreakdown`}</code>
        </div>

        {/* compare */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={H3}>GET /compare</h3>
          <p style={P}>Side-by-side comparison of up to 5 companies. PROFESSIONAL and ENTERPRISE only.</p>
          <code style={CODE}>{`GET /api/v1/compare?tickers=META,GOOGL,AMZN

Response includes per-company: violationCount, totalFines,
byCategory breakdown, bySeverity breakdown`}</code>
        </div>

        {/* summarize */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={H3}>GET /summarize</h3>
          <p style={P}>Violation summary for a company, optionally filtered by category. PROFESSIONAL and ENTERPRISE only.</p>
          <code style={CODE}>{`GET /api/v1/summarize?ticker=META&category=PRI

Response includes: totalViolations, totalFines, byCategory,
bySeverity, jurisdictions, regulatoryBases, violations[]`}</code>
        </div>
      </section>

      {/* Safeguards */}
      <section style={SECTION}>
        <h2 style={H2}>3. SAFEGUARDS</h2>
        <p style={P}>All six safeguards are active on every request.</p>

        <div style={{ display: 'grid', gap: '1rem' }}>
          {[
            ['1. Authentication', 'Every request requires a valid Bearer token. Invalid or missing tokens return 401.'],
            ['2. Suspension', 'Accounts may be suspended by OMARO PBC. Suspended keys return 403 with a contact message.'],
            ['3. Rate Limiting', 'Per-minute limits enforced by tier. Remaining quota returned in X-RateLimit-Remaining header.'],
            ['4. Audit Logging', 'Every request — including failures — is logged with API key, endpoint, company, IP, and use case.'],
            ['5. Pattern Detection', 'Queries exceeding 50 requests for a single company within 30 days are flagged for review. Client is notified.'],
            ['6. Technicality Detection', 'Queries containing legal technicality keywords (statute of limitations, appeal, dismissal, etc.) are flagged. The technicality_flag field is returned in the response.'],
          ].map(([title, desc]) => (
            <div
              key={title}
              style={{
                border: '1px solid var(--omen-border)',
                padding: '0.85rem 1rem',
                background: 'var(--omen-surface)',
              }}
            >
              <p style={{ margin: '0 0 0.3rem', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--omen-text)' }}>
                {title}
              </p>
              <p style={{ margin: 0, fontSize: '0.73rem', color: 'var(--omen-muted)', lineHeight: 1.6 }}>
                {desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Rate limits */}
      <section style={SECTION}>
        <h2 style={H2}>4. RATE LIMITS</h2>
        <div style={{ border: '1px solid var(--omen-border)' }}>
          {[
            ['STARTER', '10 req/min'],
            ['PROFESSIONAL', '50 req/min'],
            ['ENTERPRISE', '500 req/min'],
            ['RESTRICTED', '5 req/min'],
          ].map(([tier, limit], i) => (
            <div
              key={tier}
              style={{
                display: 'grid',
                gridTemplateColumns: '140px 1fr',
                padding: '0.6rem 1rem',
                borderTop: i === 0 ? 'none' : '1px solid var(--omen-border)',
                fontSize: '0.75rem',
              }}
            >
              <span style={{ color: 'var(--omen-accent)', letterSpacing: '0.1em' }}>{tier}</span>
              <span style={{ color: 'var(--omen-muted)' }}>{limit}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Watermark */}
      <section style={SECTION}>
        <h2 style={H2}>5. WATERMARK FORMAT</h2>
        <p style={P}>
          Every response is wrapped in a <code style={{ ...INLINE, display: 'inline' }}>_omen</code> envelope.
          This is not optional and cannot be stripped. It is part of the terms of service.
        </p>
        <code style={CODE}>{`{
  "data": { ... },
  "_omen": {
    "exportedBy": "Your Organization Name",
    "exportDate": "2026-03-11T00:00:00.000Z",
    "intendedUse": "Your declared use case",
    "watermark": "OMEN-a1b2c3d4-1741651200000",
    "terms": "Data from OMEN Ledger. Use restricted to declared use case."
  }
}`}</code>
        <p style={P}>
          The watermark encodes the first 8 characters of your API key and a millisecond timestamp.
          Export provenance is traceable. Misuse is detectable.
        </p>
      </section>

      {/* Use case declaration */}
      <section style={SECTION}>
        <h2 style={H2}>6. USE CASE DECLARATION</h2>
        <p style={P}>
          The <code style={{ ...INLINE, display: 'inline' }}>use_case</code> parameter is required on search endpoints.
          Requests without it return 400. The following use cases are permanently blocked:
        </p>
        <code style={CODE}>{`representing-defendant
reputation-management`}</code>
        <p style={P}>
          Attempts to query using these use cases are rejected with 403 and logged. Pattern analysis is
          applied regardless of use case declaration.
        </p>
      </section>

    </div>
  );
}
