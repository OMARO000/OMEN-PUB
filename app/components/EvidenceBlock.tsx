import type { SourceType } from '@/db/schema';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  SEC_FILING: 'SEC FILING',
  COURT_RECORD: 'COURT RECORD',
  REGULATORY_DECISION: 'REGULATORY DECISION',
  NEWS_REPORT: 'NEWS REPORT',
  GOVERNMENT_DOCUMENT: 'GOVT DOCUMENT',
};

function credibilityBar(score: number): string {
  const clamped = Math.max(0, Math.min(100, score));
  const filled = Math.round(clamped / 10);
  return '█'.repeat(filled) + '░'.repeat(10 - filled);
}

function credibilityColor(score: number): string {
  if (score <= 40) return 'var(--tag-ugly)';
  if (score <= 70) return 'var(--tag-broken-promise)';
  return 'var(--omen-accent)';
}

function truncateUrl(url: string, maxLen = 60): string {
  if (url.length <= maxLen) return url;
  return url.slice(0, maxLen - 3) + '...';
}

const DASH_SEPARATOR = '-- '.repeat(20).trimEnd();

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type EvidenceBlockProps = {
  sourceUrl: string;
  sourceType: SourceType;
  title: string;
  documentDate: Date | null;
  credibilityScore: number;
  archivedUrl?: string | null;
  isLast?: boolean;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EvidenceBlock({
  sourceUrl,
  sourceType,
  title,
  documentDate,
  credibilityScore,
  archivedUrl,
  isLast = false,
}: EvidenceBlockProps) {
  const barColor = credibilityColor(credibilityScore);

  return (
    <div style={{ paddingTop: '0.75rem' }}>
      {/* Source type label */}
      <p
        style={{
          margin: '0 0 0.3rem 0',
          fontSize: '0.7rem',
          letterSpacing: '0.12em',
          color: 'var(--omen-muted)',
        }}
      >
        [{SOURCE_TYPE_LABELS[sourceType]}]
      </p>

      {/* Title */}
      <p
        style={{
          margin: '0 0 0.4rem 0',
          fontSize: '0.85rem',
          color: 'var(--omen-accent)',
          fontWeight: 700,
        }}
      >
        {title}
      </p>

      {/* Document date */}
      {documentDate && (
        <p
          style={{
            margin: '0 0 0.4rem 0',
            fontSize: '0.7rem',
            letterSpacing: '0.06em',
            color: 'var(--omen-muted)',
          }}
        >
          {new Date(documentDate).toISOString().slice(0, 10)}
        </p>
      )}

      {/* Credibility bar */}
      <p
        style={{
          margin: '0 0 0.4rem 0',
          fontSize: '0.75rem',
          letterSpacing: '0.04em',
          color: 'var(--omen-muted)',
        }}
        aria-label={`Credibility score: ${credibilityScore} out of 100`}
      >
        {'CREDIBILITY '}
        <span style={{ color: barColor }}>
          [{credibilityBar(credibilityScore)}]
        </span>
        {' '}
        <span style={{ color: barColor }}>{credibilityScore}</span>
      </p>

      {/* Source URL + archived link */}
      <p
        style={{
          margin: '0 0 0.75rem 0',
          fontSize: '0.75rem',
          color: 'var(--omen-muted)',
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          alignItems: 'baseline',
        }}
      >
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--omen-muted)', textDecoration: 'none' }}
        >
          {truncateUrl(sourceUrl)}
        </a>
        {archivedUrl && (
          <a
            href={archivedUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--omen-accent)',
              textDecoration: 'none',
              fontSize: '0.7rem',
              letterSpacing: '0.08em',
              flexShrink: 0,
            }}
          >
            [ARCHIVED COPY]
          </a>
        )}
      </p>

      {/* Separator — dashed text line, not <hr> */}
      {!isLast && (
        <p
          aria-hidden="true"
          style={{
            margin: '0',
            fontSize: '0.7rem',
            color: 'var(--omen-border)',
            letterSpacing: '0.05em',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
          }}
        >
          {DASH_SEPARATOR}
        </p>
      )}
    </div>
  );
}
