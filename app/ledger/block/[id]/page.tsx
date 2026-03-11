import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { db } from '@/lib/db';
import { stagedBlocks, companies } from '@/db/schema';

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

const SOURCE_DISCLAIMERS = [
  'Not legal advice — relayed from SEC, FTC, DOJ, and all US Federal sources.',
  'Verify independently — relayed from regulatory sites.',
  'Data may be outdated — relayed from court databases.',
];

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

async function getBlock(blockId: string) {
  const rows = await db
    .select({
      block: stagedBlocks,
      companyName: companies.name,
      companySlug: companies.slug,
      companyTicker: companies.ticker,
    })
    .from(stagedBlocks)
    .leftJoin(companies, eq(stagedBlocks.companyId, companies.id))
    .where(eq(stagedBlocks.blockId, blockId))
    .limit(1);
  return rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const row = await getBlock(id);
  if (!row) return { title: 'Block Not Found' };
  return {
    title: row.block.blockId,
    description: `${row.block.formalSummary.slice(0, 140)} — OMEN`,
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function BlockDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await getBlock(id);
  if (!row) notFound();

  const { block, companyName, companySlug, companyTicker } = row;
  const catMeta = CATEGORY_META[block.category] ?? { label: block.category, color: 'var(--omen-muted)' };
  const tagColor = TAG_COLORS[block.violationTag] ?? 'var(--omen-muted)';
  const confPct = Math.round((block.confidenceScore ?? 0) * 100);

  const sources: Array<{ name: string; url: string; domainConfidenceBoost?: number; accessedDate?: string }> = (() => {
    try { return JSON.parse(block.sourcesJson ?? '[]'); } catch { return []; }
  })();

  const disclaimers: string[] = (() => {
    try {
      const parsed = JSON.parse(block.sourceDisclaimersJson ?? '[]');
      return parsed.length > 0 ? parsed : SOURCE_DISCLAIMERS;
    } catch { return SOURCE_DISCLAIMERS; }
  })();

  const verification: Record<string, boolean | null> = (() => {
    try { return JSON.parse(block.verificationJson ?? '{}'); } catch { return {}; }
  })();

  const brokenPromise: Record<string, unknown> | null = (() => {
    try { return block.brokenPromiseJson ? JSON.parse(block.brokenPromiseJson) : null; } catch { return null; }
  })();

  const isAutoApproved = block.confidenceRouting === 'AUTO_APPROVED';

  return (
    <div className="container" style={{ paddingTop: '2.5rem', paddingBottom: '4rem' }}>
      {/* Breadcrumb */}
      <p style={{ fontSize: '0.7rem', letterSpacing: '0.12em', color: 'var(--omen-muted)', marginBottom: '1.5rem' }}>
        <Link href="/ledger" style={{ color: 'var(--omen-muted)', textDecoration: 'none' }}>LEDGER</Link>
        {' / '}
        <Link href={`/ledger/${companySlug}`} style={{ color: 'var(--omen-muted)', textDecoration: 'none' }}>
          {companyTicker}
        </Link>
        {' / '}
        <span style={{ color: 'var(--omen-text)' }}>{block.blockId}</span>
      </p>

      {/* Block ID + status bar */}
      <div style={{
        display: 'flex',
        gap: '1.5rem',
        alignItems: 'baseline',
        flexWrap: 'wrap',
        marginBottom: '1rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid var(--omen-border)',
      }}>
        <span style={{ fontSize: '0.7rem', letterSpacing: '0.15em', color: 'var(--omen-muted)', fontFamily: 'inherit' }}>
          {block.blockId}
        </span>
        <span style={{ fontSize: '0.65rem', letterSpacing: '0.12em', color: catMeta.color }}>
          {catMeta.label}
        </span>
        <span style={{ fontSize: '0.65rem', letterSpacing: '0.1em', color: tagColor }}>
          {block.violationTag.replace(/_/g, ' ')}
        </span>
        <span style={{
          fontSize: '0.65rem',
          letterSpacing: '0.1em',
          color: isAutoApproved ? 'var(--omen-accent)' : 'var(--tag-bad)',
          marginLeft: 'auto',
        }}>
          {isAutoApproved ? '⬤ AUTO-APPROVED' : '⬤ PENDING REVIEW'} · {confPct}%
        </span>
      </div>

      {/* Company + title */}
      <header style={{ marginBottom: '2rem' }}>
        <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', letterSpacing: '0.1em' }}>
          <Link href={`/ledger/${companySlug}`} style={{ color: 'var(--omen-accent)', textDecoration: 'none' }}>
            {companyName}
          </Link>
          {block.violationDate && (
            <span style={{ color: 'var(--omen-muted)', marginLeft: '1.5rem' }}>
              {block.violationDate}
            </span>
          )}
          {block.jurisdiction && (
            <span style={{ color: 'var(--omen-muted)', marginLeft: '1.5rem' }}>
              {block.jurisdiction}
            </span>
          )}
        </p>
        <h1 style={{ fontSize: '1.4rem', margin: 0, lineHeight: 1.4, maxWidth: '720px' }}>
          {block.title}
        </h1>
      </header>

      {/* Financials — prominent if present */}
      {block.amount != null && (
        <div style={{
          border: '1px solid var(--omen-border)',
          padding: '0.75rem 1.25rem',
          marginBottom: '2rem',
          display: 'inline-flex',
          gap: '2rem',
          alignItems: 'baseline',
          flexWrap: 'wrap',
        }}>
          <div>
            <p style={{ margin: '0 0 0.2rem', fontSize: '0.6rem', letterSpacing: '0.15em', color: 'var(--omen-muted)' }}>
              DOCUMENTED PENALTY
            </p>
            <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--tag-ugly)' }}>
              {block.amountCurrency ?? 'USD'} {Number(block.amount).toLocaleString()}
            </p>
          </div>
          {block.affectedIndividuals != null && (
            <div>
              <p style={{ margin: '0 0 0.2rem', fontSize: '0.6rem', letterSpacing: '0.15em', color: 'var(--omen-muted)' }}>
                INDIVIDUALS AFFECTED
              </p>
              <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--omen-text)' }}>
                {Number(block.affectedIndividuals).toLocaleString()}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* DUAL-TONE DISPLAY                                                  */}
      {/* ----------------------------------------------------------------- */}

      {/* FORMAL */}
      <section style={{ marginBottom: '2.5rem' }}>
        <p style={{
          margin: '0 0 1rem',
          fontSize: '0.65rem',
          letterSpacing: '0.2em',
          color: 'var(--omen-muted)',
          borderBottom: '1px solid var(--omen-border)',
          paddingBottom: '0.4rem',
        }}>
          FORMAL RECORD
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '720px' }}>
          <div>
            <p style={{ margin: '0 0 0.3rem', fontSize: '0.6rem', letterSpacing: '0.15em', color: 'var(--omen-muted)' }}>
              SUMMARY
            </p>
            <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.75, color: 'var(--omen-text)' }}>
              {block.formalSummary}
            </p>
          </div>
          {block.regulatoryBasis && (
            <div>
              <p style={{ margin: '0 0 0.3rem', fontSize: '0.6rem', letterSpacing: '0.15em', color: 'var(--omen-muted)' }}>
                REGULATORY BASIS
              </p>
              <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.75, color: 'var(--omen-text)' }}>
                {block.regulatoryBasis}
              </p>
            </div>
          )}
          {block.enforcementDetails && (
            <div>
              <p style={{ margin: '0 0 0.3rem', fontSize: '0.6rem', letterSpacing: '0.15em', color: 'var(--omen-muted)' }}>
                ENFORCEMENT DETAILS
              </p>
              <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.75, color: 'var(--omen-text)' }}>
                {block.enforcementDetails}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* CONVERSATIONAL */}
      <section style={{ marginBottom: '2.5rem' }}>
        <p style={{
          margin: '0 0 1rem',
          fontSize: '0.65rem',
          letterSpacing: '0.2em',
          color: 'var(--omen-muted)',
          borderBottom: '1px solid var(--omen-border)',
          paddingBottom: '0.4rem',
        }}>
          PLAIN ENGLISH
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '720px' }}>
          {block.conversationalWhatHappened && (
            <div>
              <p style={{ margin: '0 0 0.3rem', fontSize: '0.6rem', letterSpacing: '0.15em', color: 'var(--omen-muted)' }}>
                WHAT HAPPENED
              </p>
              <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.75, color: 'var(--omen-muted)' }}>
                {block.conversationalWhatHappened}
              </p>
            </div>
          )}
          {block.conversationalWhyItMatters && (
            <div>
              <p style={{ margin: '0 0 0.3rem', fontSize: '0.6rem', letterSpacing: '0.15em', color: 'var(--omen-muted)' }}>
                WHY IT MATTERS
              </p>
              <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.75, color: 'var(--omen-muted)' }}>
                {block.conversationalWhyItMatters}
              </p>
            </div>
          )}
          {block.conversationalCompanyResponse && (
            <div>
              <p style={{ margin: '0 0 0.3rem', fontSize: '0.6rem', letterSpacing: '0.15em', color: 'var(--omen-muted)' }}>
                COMPANY RESPONSE
              </p>
              <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.75, color: 'var(--omen-muted)' }}>
                {block.conversationalCompanyResponse}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Broken promise check */}
      {brokenPromise && (brokenPromise.priorViolationExists || brokenPromise.priorCommitmentExists) && (
        <section style={{ marginBottom: '2.5rem' }}>
          <p style={{
            margin: '0 0 1rem',
            fontSize: '0.65rem',
            letterSpacing: '0.2em',
            color: 'var(--tag-broken-promise)',
            borderBottom: '1px solid var(--omen-border)',
            paddingBottom: '0.4rem',
          }}>
            BROKEN PROMISE CHECK
          </p>
          <div style={{ maxWidth: '720px', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {brokenPromise.priorViolationExists && (
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--tag-broken-promise)' }}>
                ⬤ Prior violation on record for this category
              </p>
            )}
            {brokenPromise.priorCommitmentExists && (
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--tag-broken-promise)' }}>
                ⬤ Prior public commitment contradicted by this violation
              </p>
            )}
            {brokenPromise.promiseSource && (
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--omen-muted)' }}>
                Source: {brokenPromise.promiseSource as string}
              </p>
            )}
          </div>
        </section>
      )}

      {/* Verification */}
      <section style={{ marginBottom: '2.5rem' }}>
        <p style={{
          margin: '0 0 1rem',
          fontSize: '0.65rem',
          letterSpacing: '0.2em',
          color: 'var(--omen-muted)',
          borderBottom: '1px solid var(--omen-border)',
          paddingBottom: '0.4rem',
        }}>
          VERIFICATION
        </p>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          {Object.entries(verification).map(([key, val]) => (
            <div key={key}>
              <p style={{ margin: '0 0 0.2rem', fontSize: '0.6rem', letterSpacing: '0.12em', color: 'var(--omen-muted)' }}>
                {key.replace(/([A-Z])/g, ' $1').toUpperCase().trim()}
              </p>
              <p style={{
                margin: 0,
                fontSize: '0.75rem',
                color: val === true ? 'var(--omen-accent)' : val === false ? 'var(--tag-ugly)' : 'var(--omen-muted)',
                fontWeight: 700,
              }}>
                {val === true ? 'CONFIRMED' : val === false ? 'NOT CONFIRMED' : 'N/A'}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Sources */}
      {sources.length > 0 && (
        <section style={{ marginBottom: '2.5rem' }}>
          <p style={{
            margin: '0 0 1rem',
            fontSize: '0.65rem',
            letterSpacing: '0.2em',
            color: 'var(--omen-muted)',
            borderBottom: '1px solid var(--omen-border)',
            paddingBottom: '0.4rem',
          }}>
            PRIMARY SOURCES
          </p>
          <ol role="list" style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {sources.map((s, i) => (
              <li key={i} style={{
                display: 'flex',
                gap: '1rem',
                alignItems: 'baseline',
                fontSize: '0.78rem',
                borderBottom: '1px solid var(--omen-border)',
                paddingBottom: '0.6rem',
              }}>
                <span style={{ color: 'var(--omen-accent)', flexShrink: 0 }}>{String(i + 1).padStart(2, '0')}</span>
                <div style={{ flex: 1 }}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--omen-text)', textDecoration: 'none', display: 'block', marginBottom: '0.2rem' }}
                  >
                    {s.name}
                  </a>
                  <span style={{ fontSize: '0.65rem', color: 'var(--omen-muted)', fontFamily: 'inherit' }}>
                    {s.url}
                  </span>
                </div>
                {s.domainConfidenceBoost != null && s.domainConfidenceBoost > 0 && (
                  <span style={{ fontSize: '0.65rem', color: 'var(--omen-accent)', flexShrink: 0 }}>
                    +{s.domainConfidenceBoost}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* IPFS */}
      {block.ipfsCid && (
        <section style={{ marginBottom: '2.5rem' }}>
          <p style={{
            margin: '0 0 1rem',
            fontSize: '0.65rem',
            letterSpacing: '0.2em',
            color: 'var(--omen-muted)',
            borderBottom: '1px solid var(--omen-border)',
            paddingBottom: '0.4rem',
          }}>
            IPFS RECORD
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--omen-muted)' }}>
              CID{' '}
              <a
                href={`https://gateway.pinata.cloud/ipfs/${block.ipfsCid}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--omen-accent)', textDecoration: 'none', fontFamily: 'inherit' }}
              >
                {block.ipfsCid}
              </a>
            </p>
            <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--omen-muted)' }}>
              This block is permanently pinned to IPFS. It cannot be altered or deleted.
            </p>
          </div>
        </section>
      )}

      {/* Mandatory disclaimers */}
      <section style={{
        borderTop: '1px solid var(--omen-border)',
        paddingTop: '1.5rem',
        marginTop: '1rem',
      }}>
        <p style={{ margin: '0 0 0.75rem', fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--omen-muted)' }}>
          SOURCE DISCLAIMERS
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {disclaimers.map((d, i) => (
            <li key={i} style={{ fontSize: '0.7rem', color: 'var(--omen-muted)', lineHeight: 1.6 }}>
              <span style={{ color: 'var(--omen-border)', marginRight: '0.5rem' }}>—</span>
              {d}
            </li>
          ))}
        </ul>
        <p style={{ margin: '1rem 0 0', fontSize: '0.65rem', color: 'var(--omen-muted)', letterSpacing: '0.04em' }}>
          Researched {block.researchedAt ? new Date(block.researchedAt).toISOString().slice(0, 10) : '—'}
          {' · '}
          Confidence {confPct}%
          {' · '}
          {block.confidenceRouting}
        </p>
      </section>
    </div>
  );
}
