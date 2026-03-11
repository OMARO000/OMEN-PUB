import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { companies } from '@/db/schema';
import type { ViolationCategory, ViolationStatus } from '@/db/schema';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function severityBar(severity: number): string {
  const clamped = Math.max(1, Math.min(5, severity));
  return '█'.repeat(clamped) + '░'.repeat(5 - clamped);
}

const CATEGORY_LABELS: Record<ViolationCategory, string> = {
  FINANCIAL: 'FINANCIAL',
  ENVIRONMENTAL: 'ENVIRONMENTAL',
  LABOR: 'LABOR',
  PRIVACY: 'PRIVACY',
  ANTITRUST: 'ANTITRUST',
  SAFETY: 'SAFETY',
  HUMAN_RIGHTS: 'HUMAN RIGHTS',
  CORRUPTION: 'CORRUPTION',
};

const STATUS_COLORS: Record<ViolationStatus, string> = {
  ACTIVE: 'var(--omen-accent)',
  RESOLVED: 'var(--omen-muted)',
  DISPUTED: 'var(--tag-broken-promise)',
};

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

async function getCompany(slug: string) {
  return db.query.companies.findFirst({
    where: eq(companies.slug, slug),
    with: {
      violations: {
        orderBy: (v, { desc }) => [desc(v.createdAt)],
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const company = await getCompany(slug);
  if (!company) return { title: 'Company Not Found' };
  return {
    title: company.name,
    description: `Corporate conduct record for ${company.name} — OMEN`,
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const company = await getCompany(slug);

  if (!company) notFound();

  const violationCount = company.violations.length;
  const activeCount = company.violations.filter((v) => v.status === 'ACTIVE').length;

  return (
    <div className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem' }}>
      {/* Company header */}
      <header style={{ marginBottom: '2.5rem' }}>
        <p
          style={{
            color: 'var(--omen-muted)',
            fontSize: '0.75rem',
            letterSpacing: '0.15em',
            marginBottom: '0.5rem',
          }}
        >
          CORPORATE RECORD
        </p>
        <h1
          style={{
            fontSize: '2rem',
            marginBottom: '0.75rem',
            color: 'var(--omen-text)',
          }}
        >
          {company.name}
        </h1>

        {/* Meta row */}
        <div
          style={{
            display: 'flex',
            gap: '2rem',
            flexWrap: 'wrap',
            fontSize: '0.8rem',
            color: 'var(--omen-muted)',
            letterSpacing: '0.06em',
          }}
        >
          {company.tier != null && <span>TIER {company.tier}</span>}
          <span>
            {violationCount} VIOLATION{violationCount !== 1 ? 'S' : ''}
          </span>
          {activeCount > 0 && (
            <span style={{ color: 'var(--omen-accent)' }}>
              {activeCount} ACTIVE
            </span>
          )}
          {company.website && (
            <a
              href={company.website}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--omen-muted)', textDecoration: 'none' }}
            >
              {company.website.replace(/^https?:\/\//, '')} &gt;
            </a>
          )}
        </div>

        {company.description && (
          <p
            style={{
              marginTop: '1rem',
              maxWidth: '600px',
              color: 'var(--omen-muted)',
              fontSize: '0.875rem',
              lineHeight: 1.7,
            }}
          >
            {company.description}
          </p>
        )}
      </header>

      <hr className="divider" />

      {/* Violations */}
      <section aria-labelledby="violations-heading">
        <h2
          id="violations-heading"
          style={{ fontSize: '1rem', letterSpacing: '0.1em', marginBottom: '1.5rem' }}
        >
          VIOLATION RECORD
        </h2>

        {violationCount === 0 ? (
          <p style={{ color: 'var(--omen-muted)', fontSize: '0.875rem' }}>
            -- NO RECORDS FOUND --
          </p>
        ) : (
          <ol
            role="list"
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '0',
            }}
          >
            {company.violations.map((violation, index) => (
              <li
                key={violation.id}
                style={{
                  borderTop: index === 0 ? '1px solid var(--omen-border)' : 'none',
                  borderBottom: '1px solid var(--omen-border)',
                  padding: '1rem 0',
                }}
              >
                {/* Top row: category + status */}
                <div
                  style={{
                    display: 'flex',
                    gap: '1rem',
                    alignItems: 'baseline',
                    marginBottom: '0.4rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.7rem',
                      letterSpacing: '0.12em',
                      color: 'var(--omen-muted)',
                      border: '1px solid var(--omen-border)',
                      padding: '0.1rem 0.4rem',
                    }}
                  >
                    {CATEGORY_LABELS[violation.category]}
                  </span>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      letterSpacing: '0.1em',
                      color: STATUS_COLORS[violation.status],
                    }}
                  >
                    {violation.status}
                  </span>
                </div>

                {/* Title */}
                <p
                  style={{
                    margin: '0 0 0.5rem 0',
                    fontSize: '0.95rem',
                    color: 'var(--omen-text)',
                    fontWeight: 700,
                  }}
                >
                  {violation.title}
                </p>

                {/* Severity bar + description row */}
                <div
                  style={{
                    display: 'flex',
                    gap: '1.5rem',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'inherit',
                      fontSize: '0.85rem',
                      letterSpacing: '0.05em',
                      color:
                        violation.severity >= 4
                          ? 'var(--tag-ugly)'
                          : violation.severity === 3
                            ? 'var(--tag-bad)'
                            : 'var(--omen-muted)',
                      flexShrink: 0,
                    }}
                    title={`Severity ${violation.severity} of 5`}
                    aria-label={`Severity ${violation.severity} of 5`}
                  >
                    {severityBar(violation.severity)}
                  </span>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.8rem',
                      color: 'var(--omen-muted)',
                      lineHeight: 1.6,
                      maxWidth: '560px',
                    }}
                  >
                    {violation.description}
                  </p>
                </div>

                {/* Date row */}
                {(violation.dateOccurred ?? violation.dateDiscovered) && (
                  <p
                    style={{
                      margin: '0.5rem 0 0 0',
                      fontSize: '0.7rem',
                      color: 'var(--omen-muted)',
                      letterSpacing: '0.06em',
                    }}
                  >
                    {violation.dateOccurred &&
                      `OCCURRED: ${new Date(violation.dateOccurred).toISOString().slice(0, 10)}`}
                    {violation.dateOccurred && violation.dateDiscovered && '  ·  '}
                    {violation.dateDiscovered &&
                      `DISCOVERED: ${new Date(violation.dateDiscovered).toISOString().slice(0, 10)}`}
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
