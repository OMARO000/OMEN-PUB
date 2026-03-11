'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CONTRIBUTION_TYPES } from '@/db/schema';
import type { ContributionType } from '@/db/schema';
import { REWARD_RANGES } from '@/lib/contributions/rewards';

const TYPE_LABELS: Record<ContributionType, string> = {
  BREACH_REPORT: 'BREACH REPORT',
  POLICY_CHANGE: 'POLICY CHANGE',
  COURT_DOCUMENT: 'COURT DOCUMENT',
  TRANSLATION: 'TRANSLATION',
  OCA_CONTRIBUTION: 'OCA CONTRIBUTION',
};

const TYPE_FIELDS: Record<ContributionType, { companyTicker: boolean; blockId: boolean; fileUrl: boolean }> = {
  BREACH_REPORT: { companyTicker: true, blockId: false, fileUrl: true },
  POLICY_CHANGE: { companyTicker: true, blockId: true, fileUrl: true },
  COURT_DOCUMENT: { companyTicker: true, blockId: false, fileUrl: true },
  TRANSLATION: { companyTicker: false, blockId: true, fileUrl: true },
  OCA_CONTRIBUTION: { companyTicker: false, blockId: false, fileUrl: false },
};

export default function ContributeTypePage({ params }: { params: Promise<{ type: string }> }) {
  const { type: rawType } = use(params);
  const router = useRouter();

  const type = rawType.toUpperCase() as ContributionType;
  const isValid = (CONTRIBUTION_TYPES as readonly string[]).includes(type);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [companyTicker, setCompanyTicker] = useState('');
  const [blockId, setBlockId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isValid) {
    return (
      <main id="main-content" className="page-container">
        <p className="muted-text">Invalid contribution type.</p>
      </main>
    );
  }

  const fields = TYPE_FIELDS[type];
  const rewardRange = REWARD_RANGES[type];
  const label = TYPE_LABELS[type];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/contributions/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          title,
          description,
          fileUrl: fileUrl || undefined,
          companyTicker: companyTicker || undefined,
          blockId: blockId || undefined,
        }),
      });

      if (res.status === 401) {
        router.push('/dashboard');
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Submission failed');
        return;
      }

      setSuccess(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <main id="main-content" className="page-container">
        <section aria-labelledby="success-heading">
          <h1 id="success-heading" className="page-title">SUBMITTED</h1>
          <p className="body-text" style={{ marginBottom: '1rem' }}>
            Your {label} has been received and is pending review. You will see it in your
            earnings dashboard once reviewed.
          </p>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button onClick={() => { setSuccess(false); setTitle(''); setDescription(''); setFileUrl(''); setCompanyTicker(''); setBlockId(''); }} className="btn-secondary">
              SUBMIT ANOTHER
            </button>
            <a href="/dashboard/earnings" className="btn-primary">
              VIEW EARNINGS →
            </a>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main id="main-content" className="page-container">
      <section aria-labelledby="form-heading">
        <nav style={{ marginBottom: '2rem', fontSize: '0.8rem' }}>
          <a href="/contribute" style={{ color: 'var(--omen-muted)', textDecoration: 'none' }}>
            DATA CO-OP
          </a>
          <span style={{ color: 'var(--omen-muted)', margin: '0 0.5rem' }}>/</span>
          <span style={{ color: 'var(--omen-text)' }}>{label}</span>
        </nav>

        <h1 id="form-heading" className="page-title">{label}</h1>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '3fr 1fr',
            gap: '3rem',
            alignItems: 'start',
          }}
        >
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <label className="form-label" htmlFor="title">TITLE</label>
              <input
                id="title"
                className="form-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief descriptive title"
                maxLength={300}
                required
              />
            </div>

            <div>
              <label className="form-label" htmlFor="description">DESCRIPTION</label>
              <textarea
                id="description"
                className="form-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed description with sources, dates, and context..."
                rows={10}
                maxLength={5000}
                required
                style={{ resize: 'vertical', fontFamily: 'inherit' }}
              />
              <p className="muted-text" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {description.length}/5000
              </p>
            </div>

            {fields.companyTicker && (
              <div>
                <label className="form-label" htmlFor="company-ticker">COMPANY TICKER (optional)</label>
                <input
                  id="company-ticker"
                  className="form-input"
                  type="text"
                  value={companyTicker}
                  onChange={(e) => setCompanyTicker(e.target.value.toUpperCase())}
                  placeholder="e.g. AAPL"
                  maxLength={20}
                />
              </div>
            )}

            {fields.blockId && (
              <div>
                <label className="form-label" htmlFor="block-id">BLOCK ID (optional)</label>
                <input
                  id="block-id"
                  className="form-input"
                  type="text"
                  value={blockId}
                  onChange={(e) => setBlockId(e.target.value)}
                  placeholder="Related block ID"
                  maxLength={100}
                />
              </div>
            )}

            {fields.fileUrl && (
              <div>
                <label className="form-label" htmlFor="file-url">DOCUMENT URL (optional)</label>
                <input
                  id="file-url"
                  className="form-input"
                  type="url"
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  placeholder="https://..."
                />
                <p className="muted-text" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  Link to supporting document, filing, or evidence
                </p>
              </div>
            )}

            {error && (
              <p style={{ color: '#CD853F', fontSize: '0.85rem' }}>{error}</p>
            )}

            <div>
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? 'SUBMITTING...' : 'SUBMIT FOR REVIEW →'}
              </button>
            </div>
          </form>

          <aside>
            <div
              style={{
                border: '1px solid var(--omen-border)',
                padding: '1.25rem',
                background: 'var(--omen-surface)',
              }}
            >
              <p style={{ fontSize: '0.75rem', letterSpacing: '0.1em', color: 'var(--omen-muted)', marginBottom: '1rem' }}>
                REWARD RANGE
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {(['low', 'medium', 'high'] as const).map((q) => (
                  <div key={q} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--omen-muted)', textTransform: 'uppercase' }}>{q}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--omen-text)' }}>
                      ${rewardRange[q].min}–${rewardRange[q].max}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: '1px solid var(--omen-border)', marginTop: '1rem', paddingTop: '1rem' }}>
                <p className="muted-text" style={{ fontSize: '0.75rem' }}>
                  Final reward set by reviewer based on accuracy, completeness, and impact.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
