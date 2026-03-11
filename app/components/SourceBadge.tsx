type SourceBadgeProps = {
  domain: string;
  isApproved: boolean;
  isBlocklisted: boolean;
  credibilityBase: number;
};

export default function SourceBadge({
  domain,
  isApproved,
  isBlocklisted,
  credibilityBase,
}: SourceBadgeProps) {
  if (isBlocklisted) {
    return (
      <span
        style={{
          fontFamily: 'inherit',
          fontSize: '0.75rem',
          letterSpacing: '0.06em',
          color: 'var(--tag-ugly)',
        }}
        aria-label={`${domain} — blocked source`}
      >
        [BLOCKED SOURCE]
      </span>
    );
  }

  if (isApproved) {
    return (
      <span
        style={{
          fontFamily: 'inherit',
          fontSize: '0.75rem',
          letterSpacing: '0.06em',
          color: 'var(--omen-muted)',
        }}
        aria-label={`${domain} — verified source`}
      >
        {domain}{' '}
        <span style={{ color: 'var(--omen-accent)' }}>[VERIFIED]</span>
      </span>
    );
  }

  return (
    <span
      style={{
        fontFamily: 'inherit',
        fontSize: '0.75rem',
        letterSpacing: '0.06em',
        color: 'var(--omen-muted)',
      }}
      aria-label={`${domain} — credibility ${credibilityBase}`}
    >
      {domain}{' '}
      <span style={{ color: 'var(--tag-broken-promise)' }}>{credibilityBase}</span>
    </span>
  );
}
