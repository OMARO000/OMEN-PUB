import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { eq, desc } from 'drizzle-orm';
import Link from 'next/link';
import { db } from '@/lib/db';
import { companies, stagedBlocks } from '@/db/schema';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  PRI: { label: 'PRIVACY', color: '#7eb8d4' },
  LAB: { label: 'LABOR', color: '#d4a76a' },
  ETH: { label: 'ETHICS', color: '#c47eb8' },
  ENV: { label: 'ENVIRONMENT', color: '#7eb87e' },
  ANT: { label: 'ANTITRUST', color: '#d47e7e' },
};

const TAG_COLORS: Record<string, string> = {
  BAD: 'var(--tag-bad)',
  UGLY: 'var(--tag-ugly)',
  BROKEN_PROMISE: 'var(--tag-broken-promise)',
  QUESTIONABLE: 'var(--tag-questionable)',
  GOOD: 'var(--tag-good)',
};

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

async function getCompanyWithBlocks(slug: string) {
  const company = await db
    .select()
    .from(companies)
    .where(eq(companies.slug, slug))
    .limit(1);

  if (!company[0]) return null;

  const blocks = await db
    .select()
    .from(stagedBlocks)
    .where(eq(stagedBlocks.companyId, company[0].id))
    .orderBy(desc(stagedBlocks.createdAt));

  return { company: company[0], blocks };
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ company: string }>;
}): Promise<Metadata> {
  const { company: slug } = await params;
  const data = await getCompanyWithBlocks(slug);
  if (!data) return { title: 'Company Not Found' };
  return {
    title: data.company.name,
    description: `Corporate conduct record for ${data.company.name} — OMEN`,
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ company: string }>;
}) {
  const { company: slug } = await params;
  const data = await getCompanyWithBlocks(slug);
  if (!data) notFound();

  const { company, blocks } = data;
  const autoApproved = blocks.filter(b => b.confidenceRouting === 'AUTO_APPROVED').length;
  const pending = blocks.filter(b => b.reviewStatus === 'pending').length;
  const catBreakdown = blocks.reduce<Record<string, number>>((acc, b) => {
    acc[b.category] = (acc[b.category] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="container" style={{ paddingTop: '2.5rem', paddingBottom: '4rem' }}>
      {/* Breadcrumb */}
      <p style={{ fontSize: '0.7rem', letterSpacing: '0.12em', color: 'var(--omen-muted)', marginBottom: '1.5rem' }}>
        <Link href="/ledger" style={{ color: 'var(--omen-muted)', textDecoration: 'none' }}>
          LEDGER
        </Link>
        {' / '}
        <span style={{ color: 'var(--omen-text)' }}>{company.ticker}</span>
      </p>

      {/* Company header */}
      <header style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
          <h1 style={{ fontSize: '1.75rem', margin: 0, letterSpacing: '0.03em' }}>
            {company.name}
          </h1>
          <span style={{ fontSize: '0.8rem', color: 'var(--omen-accent)', letterSpacing: '0.1em', fontWeight: 700 }}>
            {company.ticker}
          </span>
          {company.tier != null && (
            <span style={{ fontSize: '0.7rem', color: 'var(--omen-muted)', letterSpacing: '0.08em' }}>
              TIER {company.tier}
            </span>
          )}
        </div>

        {/* Stats row */}
        <div style={{
          display: 'flex',
          gap: '2rem',
          flexWrap: 'wrap',
          marginTop: '1rem',
          paddingTop: '1rem',
          borderTop: '1px solid var(--omen-border)',
          fontSize: '0.7rem',
          letterSpacing: '0.1em',
        }}>
          <span style={{ color: 'var(--omen-text)' }}>
            <span style={{ color: 'var(--omen-muted)' }}>TOTAL BLOCKS  </span>
            {blocks.length}
          </span>
          <span style={{ color: 'var(--omen-accent)' }}>
            <span style={{ color: 'var(--omen-muted)' }}>AUTO-APPROVED  </span>
            {autoApproved}
          </span>
          {pending > 0 && (
            <span style={{ color: 'var(--tag-broken-promise)' }}>
              <span style={{ color: 'var(--omen-muted)' }}>PENDING REVIEW  </span>
              {pending}
            </span>
          )}
          {Object.entries(catBreakdown).map(([cat, count]) => (
            <span key={cat} style={{ color: CATEGORY_META[cat]?.color ?? 'var(--omen-muted)' }}>
              {cat}  {count}
            </span>
          ))}
        </div>
      </header>

      <hr className="divider" style={{ margin: '0 0 2rem 0' }} />

      {/* Block list */}
      {blocks.length === 0 ? (
        <p style={{ color: 'var(--omen-muted)', fontSize: '0.875rem' }}>
          -- NO BLOCKS ON FILE FOR THIS COMPANY --
        </p>
      ) : (
        <ol role="list" style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0' }}>
          {blocks.map((block, index) => {
            const catMeta = CATEGORY_META[block.category] ?? { label: block.category, color: 'var(--omen-muted)' };
            const tagColor = TAG_COLORS[block.violationTag] ?? 'var(--omen-muted)';
            const confPct = Math.round((block.confidenceScore ?? 0) * 100);
            const sources: Array<{ name: string; url: string }> = (() => {
              try { return JSON.parse(block.sourcesJson ?? '[]'); } catch { return []; }
            })();

            return (
              <li
                key={block.blockId}
                id={block.blockId}
                style={{
                  borderTop: index === 0 ? '1px solid var(--omen-border)' : 'none',
                  borderBottom: '1px solid var(--omen-border)',
                  padding: '1.5rem 0',
                }}
              >
                {/* Block header row */}
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'baseline', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.65rem', letterSpacing: '0.12em', color: 'var(--omen-muted)', fontFamily: 'inherit' }}>
                    {block.blockId}
                  </span>
                  <span style={{ fontSize: '0.65rem', letterSpacing: '0.1em', color: catMeta.color }}>
                    {catMeta.label}
                  </span>
                  <span style={{ fontSize: '0.65rem', letterSpacing: '0.08em', color: tagColor }}>
                    {block.violationTag.replace('_', ' ')}
                  </span>
                  <span style={{
                    fontSize: '0.65rem',
                    letterSpacing: '0.08em',
                    color: confPct >= 93 ? 'var(--omen-accent)' : 'var(--tag-bad)',
                    marginLeft: 'auto',
                  }}>
                    {confPct >= 93 ? 'AUTO-APPROVED' : 'REVIEW'} · {confPct}%
                  </span>
                </div>

                {/* Title */}
                <h2 style={{ fontSize: '1rem', margin: '0 0 1rem 0', fontWeight: 700, lineHeight: 1.4, maxWidth: '700px' }}>
                  {block.title}
                </h2>

                {/* Formal summary */}
                <div style={{ marginBottom: '1rem' }}>
                  <p style={{ margin: '0 0 0.3rem', fontSize: '0.65rem', letterSpacing: '0.15em', color: 'var(--omen-muted)' }}>
                    FORMAL SUMMARY
                  </p>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--omen-text)', lineHeight: 1.7, maxWidth: '680px' }}>
                    {block.formalSummary}
                  </p>
                </div>

                {/* Plain English */}
                {block.conversationalWhatHappened && (
                  <div style={{ marginBottom: '1rem' }}>
                    <p style={{ margin: '0 0 0.3rem', fontSize: '0.65rem', letterSpacing: '0.15em', color: 'var(--omen-muted)' }}>
                      WHAT HAPPENED
                    </p>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--omen-muted)', lineHeight: 1.7, maxWidth: '680px' }}>
                      {block.conversationalWhatHappened}
                    </p>
                  </div>
                )}

                {/* Enforcement + regulatory row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1rem', maxWidth: '680px' }}>
                  {block.regulatoryBasis && (
                    <div>
                      <p style={{ margin: '0 0 0.3rem', fontSize: '0.65rem', letterSpacing: '0.12em', color: 'var(--omen-muted)' }}>
                        REGULATORY BASIS
                      </p>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--omen-text)', lineHeight: 1.6 }}>
                        {block.regulatoryBasis}
                      </p>
                    </div>
                  )}
                  {block.jurisdiction && (
                    <div>
                      <p style={{ margin: '0 0 0.3rem', fontSize: '0.65rem', letterSpacing: '0.12em', color: 'var(--omen-muted)' }}>
                        JURISDICTION
                      </p>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--omen-text)', lineHeight: 1.6 }}>
                        {block.jurisdiction}
                      </p>
                    </div>
                  )}
                </div>

                {/* Financials */}
                {block.amount != null && (
                  <div style={{ marginBottom: '1rem' }}>
                    <p style={{ margin: '0 0 0.3rem', fontSize: '0.65rem', letterSpacing: '0.15em', color: 'var(--omen-muted)' }}>
                      FINANCIAL PENALTY
                    </p>
                    <p style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--tag-ugly)' }}>
                      {block.amountCurrency ?? 'USD'} {Number(block.amount).toLocaleString()}
                      {block.affectedIndividuals != null && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--omen-muted)', fontWeight: 400, marginLeft: '1rem' }}>
                          {Number(block.affectedIndividuals).toLocaleString()} INDIVIDUALS AFFECTED
                        </span>
                      )}
                    </p>
                  </div>
                )}

                {/* Sources */}
                {sources.length > 0 && (
                  <div style={{ marginBottom: '0.5rem' }}>
                    <p style={{ margin: '0 0 0.4rem', fontSize: '0.65rem', letterSpacing: '0.15em', color: 'var(--omen-muted)' }}>
                      SOURCES
                    </p>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      {sources.map((s, i) => (
                        <li key={i} style={{ fontSize: '0.72rem' }}>
                          <a
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: 'var(--omen-muted)', textDecoration: 'none' }}
                          >
                            <span style={{ color: 'var(--omen-accent)', marginRight: '0.4rem' }}>›</span>
                            {s.name}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* IPFS CID */}
                {block.ipfsCid && (
                  <p style={{ margin: '0.75rem 0 0', fontSize: '0.65rem', color: 'var(--omen-muted)', letterSpacing: '0.04em' }}>
                    IPFS{' '}
                    <a
                      href={`https://gateway.pinata.cloud/ipfs/${block.ipfsCid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--omen-accent)', textDecoration: 'none', fontFamily: 'inherit' }}
                    >
                      {block.ipfsCid}
                    </a>
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
