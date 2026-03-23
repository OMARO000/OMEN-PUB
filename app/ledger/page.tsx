import type { Metadata } from 'next';
import Link from 'next/link';
import { desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { stagedBlocks, companies } from '@/db/schema';

export const metadata: Metadata = {
  title: 'Ledger',
  description: 'The public ledger of corporate conduct, maintained by OMARO PBC.',
};

export const revalidate = 60;

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
// Seed blocks — replaced by real data once agent runs
// ---------------------------------------------------------------------------

const SEED_BLOCKS = [
  {
    id: -1,
    blockId: 'OM-2023-PRI-META-001',
    companyId: -1,
    category: 'PRI',
    violationTag: 'UGLY',
    title: 'Cambridge Analytica — Unauthorized harvesting of 87M user profiles',
    formalSummary: 'Meta permitted third-party application to harvest personal data of approximately 87 million Facebook users without explicit consent, in violation of FTC consent decree.',
    jurisdiction: 'United States',
    confidenceScore: 0.97,
    confidenceRouting: 'AUTO_APPROVED',
    primarySourceUrl: 'https://www.ftc.gov/news-events/news/press-releases/2019/07/ftc-imposes-5-billion-penalty-sweeping-new-privacy-restrictions-facebook',
    violationDate: '2018-03-17',
    researchedAt: new Date().toISOString(),
    company: { name: 'Meta', slug: 'meta', ticker: 'META' },
  },
  {
    id: -2,
    blockId: 'OM-2022-ANT-GOOG-001',
    companyId: -2,
    category: 'ANT',
    violationTag: 'BAD',
    title: 'Search monopoly — DOJ antitrust action over default search agreements',
    formalSummary: 'Department of Justice filed suit alleging Google illegally maintained monopoly in general search and search advertising through exclusive default agreements with device manufacturers.',
    jurisdiction: 'United States',
    confidenceScore: 0.95,
    confidenceRouting: 'AUTO_APPROVED',
    primarySourceUrl: 'https://www.justice.gov/opa/pr/justice-department-sues-monopolist-google-violating-antitrust-laws',
    violationDate: '2020-10-20',
    researchedAt: new Date().toISOString(),
    company: { name: 'Google', slug: 'goog', ticker: 'GOOG' },
  },
  {
    id: -3,
    blockId: 'OM-2023-LAB-AMZN-001',
    companyId: -3,
    category: 'LAB',
    violationTag: 'BAD',
    title: 'NLRB ruling — Illegal termination of union organizers at Staten Island facility',
    formalSummary: 'National Labor Relations Board ruled Amazon illegally terminated two workers involved in union organizing at JFK8 facility, ordering reinstatement and back pay.',
    jurisdiction: 'United States',
    confidenceScore: 0.93,
    confidenceRouting: 'AUTO_APPROVED',
    primarySourceUrl: 'https://www.nlrb.gov',
    violationDate: '2022-04-01',
    researchedAt: new Date().toISOString(),
    company: { name: 'Amazon', slug: 'amzn', ticker: 'AMZN' },
  },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function LedgerPage() {
  // Attempt live query; fall back to seed data if DB is empty
  let liveBlocks: typeof SEED_BLOCKS = [];
  let totalCount = 0;
  let categoryCounts: Record<string, number> = {};

  try {
    const rows = await db
      .select({
        id: stagedBlocks.id,
        blockId: stagedBlocks.blockId,
        companyId: stagedBlocks.companyId,
        category: stagedBlocks.category,
        violationTag: stagedBlocks.violationTag,
        title: stagedBlocks.title,
        formalSummary: stagedBlocks.formalSummary,
        jurisdiction: stagedBlocks.jurisdiction,
        confidenceScore: stagedBlocks.confidenceScore,
        confidenceRouting: stagedBlocks.confidenceRouting,
        primarySourceUrl: stagedBlocks.primarySourceUrl,
        violationDate: stagedBlocks.violationDate,
        researchedAt: stagedBlocks.researchedAt,
        companyName: companies.name,
        companySlug: companies.slug,
        companyTicker: companies.ticker,
      })
      .from(stagedBlocks)
      .leftJoin(companies, (t) => t.eq(stagedBlocks.companyId, companies.id))
      .orderBy(desc(stagedBlocks.createdAt))
      .limit(50);

    if (rows.length > 0) {
      liveBlocks = rows.map(r => ({
        ...r,
        company: { name: r.companyName ?? '', slug: r.companySlug ?? '', ticker: r.companyTicker ?? '' },
      }));
      totalCount = rows.length;
      for (const r of rows) {
        categoryCounts[r.category] = (categoryCounts[r.category] ?? 0) + 1;
      }
    }
  } catch {
    // DB not ready — use seed
  }

  const usingSeed = liveBlocks.length === 0;
  const displayBlocks = usingSeed ? SEED_BLOCKS : liveBlocks;

  if (usingSeed) {
    totalCount = SEED_BLOCKS.length;
    for (const b of SEED_BLOCKS) {
      categoryCounts[b.category] = (categoryCounts[b.category] ?? 0) + 1;
    }
  }

  return (
    <div className="container" style={{ paddingTop: '2.5rem', paddingBottom: '4rem' }}>
      {/* Header */}
      <header style={{ marginBottom: '2rem' }}>
        <p style={{
          color: 'var(--omen-muted)',
          fontSize: '0.7rem',
          letterSpacing: '0.2em',
          marginBottom: '0.5rem',
        }}>
          PUBLIC RECORD / LEDGER
        </p>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
          CORPORATE CONDUCT LEDGER
        </h1>
        <p style={{ color: 'var(--omen-muted)', fontSize: '0.8rem', maxWidth: '560px', lineHeight: 1.7 }}>
          Every verified act of corporate misconduct — sourced exclusively from government enforcement actions,
          court records, and regulatory decisions. Permanent. Open. Immutable.
        </p>
      </header>

      {/* Stats row */}
      <div style={{
        display: 'flex',
        gap: '2rem',
        flexWrap: 'wrap',
        marginBottom: '2rem',
        paddingBottom: '1.5rem',
        borderBottom: '1px solid var(--omen-border)',
      }}>
        <div>
          <p style={{ margin: 0, fontSize: '0.65rem', letterSpacing: '0.15em', color: 'var(--omen-muted)' }}>
            TOTAL BLOCKS
          </p>
          <p style={{ margin: '0.2rem 0 0', fontSize: '1.5rem', fontWeight: 700, color: 'var(--omen-accent)' }}>
            {usingSeed ? '[ — ]' : totalCount.toLocaleString()}
          </p>
        </div>
        {Object.entries(CATEGORY_META).map(([cat, meta]) => (
          <div key={cat}>
            <p style={{ margin: 0, fontSize: '0.65rem', letterSpacing: '0.15em', color: meta.color }}>
              {meta.label}
            </p>
            <p style={{ margin: '0.2rem 0 0', fontSize: '1.5rem', fontWeight: 700, color: 'var(--omen-text)' }}>
              {usingSeed ? '[ — ]' : (categoryCounts[cat] ?? 0)}
            </p>
          </div>
        ))}
      </div>

      {/* Seed notice */}
      {usingSeed && (
        <div style={{
          border: '1px solid var(--omen-border)',
          padding: '0.6rem 1rem',
          marginBottom: '2rem',
          fontSize: '0.75rem',
          color: 'var(--omen-muted)',
          letterSpacing: '0.04em',
        }}>
          PREVIEW — Agent run pending. Displaying sample blocks. Real data populates after first run.
        </div>
      )}

      {/* Column headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 80px 90px 60px',
        gap: '1rem',
        padding: '0.4rem 0',
        borderBottom: '1px solid var(--omen-border)',
        fontSize: '0.65rem',
        letterSpacing: '0.15em',
        color: 'var(--omen-muted)',
      }}>
        <span>BLOCK / COMPANY</span>
        <span>CATEGORY</span>
        <span>TAG</span>
        <span style={{ textAlign: 'right' }}>CONF</span>
      </div>

      {/* Block list */}
      <ol role="list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {displayBlocks.map((block) => {
          const catMeta = CATEGORY_META[block.category] ?? { label: block.category, color: 'var(--omen-muted)' };
          const tagColor = TAG_COLORS[block.violationTag] ?? 'var(--omen-muted)';
          const confPct = Math.round((block.confidenceScore ?? 0) * 100);

          return (
            <li
              key={block.blockId}
              style={{
                borderBottom: '1px solid var(--omen-border)',
                padding: '0.9rem 0',
              }}
            >
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 80px 90px 60px',
                gap: '1rem',
                alignItems: 'start',
              }}>
                {/* Title + company + block ID */}
                <div>
                  <Link
                    href={`/ledger/${block.company.slug}`}
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: 'var(--omen-text)',
                      textDecoration: 'none',
                      lineHeight: 1.4,
                      display: 'block',
                    }}
                  >
                    {block.title}
                  </Link>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--omen-accent)', letterSpacing: '0.06em' }}>
                      {block.company.ticker}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--omen-muted)', letterSpacing: '0.04em' }}>
                      {block.blockId}
                    </span>
                    {block.violationDate && (
                      <span style={{ fontSize: '0.65rem', color: 'var(--omen-muted)' }}>
                        {block.violationDate}
                      </span>
                    )}
                  </div>
                </div>

                {/* Category */}
                <span style={{
                  fontSize: '0.65rem',
                  letterSpacing: '0.1em',
                  color: catMeta.color,
                  paddingTop: '0.1rem',
                }}>
                  {catMeta.label}
                </span>

                {/* Tag */}
                <span style={{
                  fontSize: '0.65rem',
                  letterSpacing: '0.08em',
                  color: tagColor,
                  paddingTop: '0.1rem',
                }}>
                  {block.violationTag.replace('_', ' ')}
                </span>

                {/* Confidence */}
                <span style={{
                  fontSize: '0.7rem',
                  color: confPct >= 93 ? 'var(--omen-accent)' : 'var(--tag-bad)',
                  textAlign: 'right',
                  paddingTop: '0.1rem',
                  fontWeight: 700,
                }}>
                  {confPct}%
                </span>
              </div>
            </li>
          );
        })}
      </ol>

      {!usingSeed && totalCount === 0 && (
        <p style={{ color: 'var(--omen-muted)', fontSize: '0.875rem', marginTop: '2rem' }}>
          -- NO RECORDS. AGENT RUN PENDING. --
        </p>
      )}
    </div>
  );
}
