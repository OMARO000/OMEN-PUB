import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'API Pricing — OMEN',
  description: 'OMEN API pricing tiers. Programmatic access to the corporate accountability ledger.',
};

const TIERS = [
  {
    name: 'STARTER',
    price: '$99/month',
    calls: '10,000 calls/month',
    rateLimit: '10 req/min',
    endpoints: ['GET /violations/search', 'GET /violations/:id', 'GET /companies/:ticker'],
    note: 'Ledger access only. Best for researchers and journalists.',
    accent: 'var(--omen-accent)',
  },
  {
    name: 'PROFESSIONAL',
    price: '$299/month',
    calls: '50,000 calls/month',
    rateLimit: '50 req/min',
    endpoints: ['All STARTER endpoints', 'GET /compare', 'GET /summarize'],
    note: 'Full intelligence layer. Best for media organizations and ESG platforms.',
    accent: '#7eb8d4',
  },
  {
    name: 'ENTERPRISE',
    price: 'Custom',
    calls: 'Unlimited',
    rateLimit: '500 req/min',
    endpoints: ['All PROFESSIONAL endpoints', 'Custom endpoints available', 'Dedicated support'],
    note: 'For large-scale integrations. Contact for pricing.',
    accent: '#c47eb8',
  },
  {
    name: 'RESTRICTED',
    price: 'Custom',
    calls: 'Limited',
    rateLimit: '5 req/min',
    endpoints: ['GET /violations/search', 'GET /violations/:id'],
    note: 'High-risk access category. Subject to enhanced audit and manual review.',
    accent: 'var(--tag-ugly)',
  },
];

export default function ApiPricingPage() {
  return (
    <div className="container" style={{ paddingTop: '3rem', paddingBottom: '5rem', maxWidth: '720px' }}>
      <p style={{ fontSize: '0.7rem', letterSpacing: '0.2em', color: 'var(--omen-muted)', marginBottom: '0.5rem' }}>
        OMEN API / PRICING
      </p>
      <h1 style={{ fontSize: '1.4rem', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
        ACCESS TIERS
      </h1>
      <p style={{ fontSize: '0.75rem', color: 'var(--omen-muted)', marginBottom: '2.5rem', lineHeight: 1.7 }}>
        All tiers are subject to use case review and{' '}
        <Link href="/legal" style={{ color: 'var(--omen-accent)', textDecoration: 'none' }}>
          Terms of Service
        </Link>
        . API keys are issued by OMARO PBC after manual review.
      </p>

      <hr style={{ borderTop: '1px solid var(--omen-border)', marginBottom: '2.5rem' }} />

      <div style={{ display: 'grid', gap: '1.25rem', marginBottom: '3rem' }}>
        {TIERS.map((tier) => (
          <div
            key={tier.name}
            style={{
              border: `1px solid ${tier.accent}`,
              background: 'var(--omen-surface)',
              padding: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <p style={{ margin: '0 0 0.25rem', fontSize: '0.7rem', letterSpacing: '0.2em', color: tier.accent }}>
                  {tier.name}
                </p>
                <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--omen-text)', letterSpacing: '-0.01em' }}>
                  {tier.price}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: '0 0 0.2rem', fontSize: '0.7rem', color: 'var(--omen-text)' }}>{tier.calls}</p>
                <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--omen-muted)' }}>{tier.rateLimit}</p>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--omen-border)', paddingTop: '0.85rem', marginBottom: '0.85rem' }}>
              <p style={{ margin: '0 0 0.4rem', fontSize: '0.6rem', letterSpacing: '0.15em', color: 'var(--omen-muted)' }}>
                ENDPOINTS
              </p>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {tier.endpoints.map((ep) => (
                  <li key={ep} style={{ fontSize: '0.72rem', color: 'var(--omen-text)', lineHeight: 2, paddingLeft: '0.75rem', borderLeft: `2px solid ${tier.accent}` }}>
                    {ep}
                  </li>
                ))}
              </ul>
            </div>

            <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--omen-muted)', lineHeight: 1.6 }}>
              {tier.note}
            </p>
          </div>
        ))}
      </div>

      {/* All tiers notice */}
      <div style={{
        border: '1px solid var(--omen-border)',
        padding: '1rem 1.25rem',
        fontSize: '0.72rem',
        color: 'var(--omen-muted)',
        lineHeight: 1.7,
        marginBottom: '2.5rem',
      }}>
        <strong style={{ color: 'var(--omen-text)', letterSpacing: '0.08em' }}>ALL TIERS: </strong>
        All API access includes watermarked responses, full audit logging, pattern detection, technicality
        flagging, use case declaration requirements, and suspension capabilities.
        OMARO PBC reserves the right to terminate access for misuse at any time.
      </div>

      {/* Apply CTA */}
      <div>
        <p style={{ fontSize: '0.75rem', color: 'var(--omen-muted)', marginBottom: '1rem' }}>
          To apply for API access, send your organization name, use case, and desired tier to:
        </p>
        <a
          href="mailto:api@omaro.pub?subject=API%20Access%20Application"
          style={{
            display: 'inline-block',
            padding: '0.65rem 1.5rem',
            border: '1px solid var(--omen-accent)',
            color: 'var(--omen-accent)',
            fontSize: '0.8rem',
            letterSpacing: '0.15em',
            textDecoration: 'none',
          }}
        >
          APPLY FOR API ACCESS →
        </a>
        <p style={{ marginTop: '0.75rem', fontSize: '0.65rem', color: 'var(--omen-muted)' }}>
          api@omaro.pub — All applications reviewed within 5 business days.
        </p>
      </div>

      <hr style={{ borderTop: '1px solid var(--omen-border)', margin: '2.5rem 0' }} />

      <Link
        href="/api-docs"
        style={{ fontSize: '0.72rem', color: 'var(--omen-muted)', textDecoration: 'none', letterSpacing: '0.08em' }}
      >
        ← VIEW API DOCUMENTATION
      </Link>
    </div>
  );
}
