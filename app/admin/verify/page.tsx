import { db } from '@/lib/db';
import { stagedBlocks, companies } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import Link from 'next/link';

export const revalidate = 0;

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  PRI: { label: 'PRIVACY', color: '#7eb8d4' },
  LAB: { label: 'LABOR', color: '#d4a76a' },
  ETH: { label: 'ETHICS', color: '#c47eb8' },
  ENV: { label: 'ENVIRONMENT', color: '#7eb87e' },
  ANT: { label: 'ANTITRUST', color: '#d47e7e' },
};

const ROUTING_COLORS: Record<string, string> = {
  AUTO_APPROVED: 'var(--omen-accent)',
  QUICK_REVIEW: 'var(--tag-broken-promise)',
  REJECTED: 'var(--tag-ugly)',
};

export default async function AdminVerifyPage() {
  const rows = await db
    .select({
      id: stagedBlocks.id,
      blockId: stagedBlocks.blockId,
      category: stagedBlocks.category,
      violationTag: stagedBlocks.violationTag,
      title: stagedBlocks.title,
      formalSummary: stagedBlocks.formalSummary,
      confidenceScore: stagedBlocks.confidenceScore,
      confidenceRouting: stagedBlocks.confidenceRouting,
      reviewStatus: stagedBlocks.reviewStatus,
      primarySourceUrl: stagedBlocks.primarySourceUrl,
      violationDate: stagedBlocks.violationDate,
      researchedAt: stagedBlocks.researchedAt,
      companyName: companies.name,
      companyTicker: companies.ticker,
      companySlug: companies.slug,
    })
    .from(stagedBlocks)
    .leftJoin(companies, eq(stagedBlocks.companyId, companies.id))
    .orderBy(desc(stagedBlocks.createdAt));

  // Counts
  const total = rows.length;
  const autoApproved = rows.filter(r => r.confidenceRouting === 'AUTO_APPROVED').length;
  const quickReview = rows.filter(r => r.confidenceRouting === 'QUICK_REVIEW').length;
  const rejected = rows.filter(r => r.confidenceRouting === 'REJECTED').length;
  const pending = rows.filter(r => r.reviewStatus === 'pending').length;

  return (
    <div className="container" style={{ paddingTop: '2.5rem', paddingBottom: '4rem' }}>

      {/* Header */}
      <header style={{ marginBottom: '2rem' }}>
        <p style={{ fontSize: '0.7rem', letterSpacing: '0.2em', color: 'var(--omen-muted)', marginBottom: '0.5rem' }}>
          ADMIN / VERIFICATION QUEUE
        </p>
        <h1 style={{ fontSize: '1.5rem', letterSpacing: '0.05em', marginBottom: '1.5rem' }}>
          BLOCK REVIEW DASHBOARD
        </h1>

        {/* Stats */}
        <div style={{
          display: 'flex',
          gap: '2rem',
          flexWrap: 'wrap',
          paddingBottom: '1.5rem',
          borderBottom: '1px solid var(--omen-border)',
        }}>
          {[
            { label: 'TOTAL', value: total, color: 'var(--omen-text)' },
            { label: 'AUTO-APPROVED', value: autoApproved, color: 'var(--omen-accent)' },
            { label: 'QUICK REVIEW', value: quickReview, color: 'var(--tag-broken-promise)' },
            { label: 'REJECTED', value: rejected, color: 'var(--tag-ugly)' },
            { label: 'PENDING', value: pending, color: 'var(--tag-bad)' },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <p style={{ margin: '0 0 0.2rem', fontSize: '0.6rem', letterSpacing: '0.15em', color: 'var(--omen-muted)' }}>
                {label}
              </p>
              <p style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color }}>
                {value}
              </p>
            </div>
          ))}
        </div>
      </header>

      {/* Empty state */}
      {total === 0 && (
        <p style={{ color: 'var(--omen-muted)', fontSize: '0.875rem' }}>
          -- NO BLOCKS STAGED. RUN THE AGENT FIRST. --
        </p>
      )}

      {/* Block list */}
      {total > 0 && (
        <>
          {/* Column headers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 60px 100px 80px 70px',
            gap: '1rem',
            padding: '0.4rem 0',
            borderBottom: '1px solid var(--omen-border)',
            fontSize: '0.6rem',
            letterSpacing: '0.15em',
            color: 'var(--omen-muted)',
            marginBottom: '0',
          }}>
            <span>BLOCK</span>
            <span>CAT</span>
            <span>ROUTING</span>
            <span>STATUS</span>
            <span style={{ textAlign: 'right' }}>CONF</span>
          </div>

          <ol role="list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {rows.map((row) => {
              const catMeta = CATEGORY_META[row.category] ?? { label: row.category, color: 'var(--omen-muted)' };
              const routingColor = ROUTING_COLORS[row.confidenceRouting ?? ''] ?? 'var(--omen-muted)';
              const confPct = Math.round((row.confidenceScore ?? 0) * 100);
              const statusColor = row.reviewStatus === 'approved'
                ? 'var(--omen-accent)'
                : row.reviewStatus === 'rejected'
                  ? 'var(--tag-ugly)'
                  : 'var(--tag-broken-promise)';

              return (
                <li
                  key={row.blockId}
                  style={{
                    borderBottom: '1px solid var(--omen-border)',
                    padding: '0.85rem 0',
                  }}
                >
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 60px 100px 80px 70px',
                    gap: '1rem',
                    alignItems: 'start',
                  }}>
                    {/* Title + meta */}
                    <div>
                      <Link
                        href={`/ledger/block/${row.blockId}`}
                        style={{
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          color: 'var(--omen-text)',
                          textDecoration: 'none',
                          display: 'block',
                          lineHeight: 1.4,
                          marginBottom: '0.25rem',
                        }}
                      >
                        {row.title}
                      </Link>
                      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.65rem', color: 'var(--omen-accent)' }}>
                          {row.companyTicker}
                        </span>
                        <span style={{ fontSize: '0.6rem', color: 'var(--omen-muted)' }}>
                          {row.blockId}
                        </span>
                        {row.primarySourceUrl && (
                          <a
                            href={row.primarySourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: '0.6rem', color: 'var(--omen-muted)', textDecoration: 'none' }}
                          >
                            SOURCE ›
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Category */}
                    <span style={{ fontSize: '0.65rem', color: catMeta.color, paddingTop: '0.1rem' }}>
                      {row.category}
                    </span>

                    {/* Routing */}
                    <span style={{ fontSize: '0.6rem', color: routingColor, paddingTop: '0.1rem', letterSpacing: '0.05em' }}>
                      {(row.confidenceRouting ?? '').replace(/_/g, ' ')}
                    </span>

                    {/* Review status */}
                    <span style={{ fontSize: '0.65rem', color: statusColor, paddingTop: '0.1rem', letterSpacing: '0.06em' }}>
                      {(row.reviewStatus ?? '').toUpperCase()}
                    </span>

                    {/* Confidence */}
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: confPct >= 93 ? 'var(--omen-accent)' : confPct >= 80 ? 'var(--tag-broken-promise)' : 'var(--tag-ugly)',
                      textAlign: 'right',
                      paddingTop: '0.1rem',
                    }}>
                      {confPct}%
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </div>
  );
}
