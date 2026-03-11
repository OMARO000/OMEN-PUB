'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PAYOUT_METHODS } from '@/db/schema';
import type { PayoutMethod } from '@/db/schema';
import { MINIMUM_PAYOUT } from '@/lib/contributions/payout';

interface Contribution {
  id: number;
  type: string;
  title: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  rewardAmount: number | null;
  rejectionReason: string | null;
  reviewedAt: number | null;
  createdAt: number;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'var(--omen-muted)',
  approved: '#228B22',
  rejected: '#8B0000',
  paid: '#228B22',
};

export default function EarningsPage() {
  const router = useRouter();
  const [balance, setBalance] = useState<number | null>(null);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);

  // Withdrawal form
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod>('MONERO');
  const [payoutAddress, setPayoutAddress] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      // Check session
      const sessionRes = await fetch('/api/auth/verify-account');
      if (!sessionRes.ok) {
        router.push('/dashboard');
        return;
      }

      // Load contributions
      const contRes = await fetch('/api/contributions/list');
      if (contRes.ok) {
        const data = await contRes.json();
        setContributions(data.contributions ?? []);
      }

      // Load balance
      const balRes = await fetch('/api/dashboard/balance');
      if (balRes.ok) {
        const data = await balRes.json();
        setBalance(data.bonusBalance ?? 0);
      }

      setLoading(false);
    }

    load();
  }, [router]);

  async function handleWithdraw(e: React.FormEvent) {
    e.preventDefault();
    setWithdrawError('');
    setWithdrawing(true);

    const amount = parseFloat(withdrawAmount);

    try {
      const res = await fetch('/api/contributions/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, payoutMethod, payoutAddress: payoutAddress || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        setWithdrawError(data.error ?? 'Withdrawal failed');
        return;
      }

      setWithdrawSuccess(true);
      setBalance((prev) => (prev !== null ? prev - amount : null));
      setShowWithdraw(false);
      setWithdrawAmount('');
      setPayoutAddress('');
    } catch {
      setWithdrawError('Network error. Please try again.');
    } finally {
      setWithdrawing(false);
    }
  }

  if (loading) {
    return (
      <main id="main-content" className="page-container">
        <p className="muted-text">Loading...</p>
      </main>
    );
  }

  const totalEarned = contributions
    .filter((c) => c.status === 'approved' || c.status === 'paid')
    .reduce((sum, c) => sum + (c.rewardAmount ?? 0), 0);

  return (
    <main id="main-content" className="page-container">
      <section aria-labelledby="earnings-heading">
        <h1 id="earnings-heading" className="page-title">EARNINGS</h1>

        {withdrawSuccess && (
          <div
            style={{
              border: '1px solid #228B22',
              padding: '1rem',
              marginBottom: '2rem',
              background: 'var(--omen-surface)',
              color: '#228B22',
              fontSize: '0.85rem',
            }}
          >
            Withdrawal request submitted. Processing within 1–3 business days.
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '1px',
            background: 'var(--omen-border)',
            border: '1px solid var(--omen-border)',
            marginBottom: '2rem',
          }}
        >
          {[
            { label: 'BONUS BALANCE', value: `$${(balance ?? 0).toFixed(2)}` },
            { label: 'TOTAL EARNED', value: `$${totalEarned.toFixed(2)}` },
            { label: 'SUBMISSIONS', value: String(contributions.length) },
            { label: 'APPROVED', value: String(contributions.filter((c) => c.status === 'approved' || c.status === 'paid').length) },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: 'var(--omen-surface)', padding: '1.25rem' }}>
              <p style={{ fontSize: '0.7rem', letterSpacing: '0.1em', color: 'var(--omen-muted)', marginBottom: '0.5rem' }}>
                {label}
              </p>
              <p style={{ fontSize: '1.4rem', fontFamily: 'inherit', color: 'var(--omen-text)' }}>
                {value}
              </p>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowWithdraw(!showWithdraw)}
            className="btn-primary"
            disabled={(balance ?? 0) < MINIMUM_PAYOUT}
          >
            {showWithdraw ? 'CANCEL' : 'WITHDRAW →'}
          </button>
          <a href="/contribute" className="btn-secondary">
            SUBMIT CONTRIBUTION →
          </a>
        </div>

        {(balance ?? 0) < MINIMUM_PAYOUT && (
          <p className="muted-text" style={{ fontSize: '0.8rem', marginBottom: '1.5rem' }}>
            Minimum withdrawal is ${MINIMUM_PAYOUT}. Current balance: ${(balance ?? 0).toFixed(2)}.
          </p>
        )}

        {showWithdraw && (
          <form
            onSubmit={handleWithdraw}
            style={{
              border: '1px solid var(--omen-border)',
              padding: '1.5rem',
              background: 'var(--omen-surface)',
              marginBottom: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              maxWidth: '480px',
            }}
          >
            <h2 style={{ fontSize: '0.85rem', letterSpacing: '0.1em' }}>WITHDRAWAL REQUEST</h2>

            <div>
              <label className="form-label" htmlFor="withdraw-amount">AMOUNT (USD)</label>
              <input
                id="withdraw-amount"
                className="form-input"
                type="number"
                min={MINIMUM_PAYOUT}
                max={balance ?? 0}
                step="0.01"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="form-label" htmlFor="payout-method">PAYOUT METHOD</label>
              <select
                id="payout-method"
                className="form-input"
                value={payoutMethod}
                onChange={(e) => setPayoutMethod(e.target.value as PayoutMethod)}
              >
                {PAYOUT_METHODS.filter((m) => m !== 'FIAT').map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label" htmlFor="payout-address">WALLET ADDRESS</label>
              <input
                id="payout-address"
                className="form-input"
                type="text"
                value={payoutAddress}
                onChange={(e) => setPayoutAddress(e.target.value)}
                placeholder={payoutMethod === 'MONERO' ? 'Monero address...' : 'USDC wallet address...'}
                maxLength={500}
              />
            </div>

            {withdrawError && (
              <p style={{ color: '#CD853F', fontSize: '0.85rem' }}>{withdrawError}</p>
            )}

            <button type="submit" className="btn-primary" disabled={withdrawing}>
              {withdrawing ? 'PROCESSING...' : 'CONFIRM WITHDRAWAL →'}
            </button>

            <p className="muted-text" style={{ fontSize: '0.75rem' }}>
              Fiat/bank transfers require manual processing. Contact support.
            </p>
          </form>
        )}

        <h2 style={{ fontSize: '0.85rem', letterSpacing: '0.1em', marginBottom: '1rem' }}>
          CONTRIBUTION HISTORY
        </h2>

        {contributions.length === 0 ? (
          <p className="muted-text">No contributions yet. <a href="/contribute" style={{ color: 'var(--omen-text)' }}>Submit one →</a></p>
        ) : (
          <div style={{ border: '1px solid var(--omen-border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--omen-border)' }}>
                  {['DATE', 'TYPE', 'TITLE', 'STATUS', 'REWARD'].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '0.75rem 1rem',
                        textAlign: 'left',
                        fontSize: '0.7rem',
                        letterSpacing: '0.1em',
                        color: 'var(--omen-muted)',
                        fontWeight: 'normal',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contributions.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--omen-border)' }}>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: 'var(--omen-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(c.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', letterSpacing: '0.08em', color: 'var(--omen-muted)' }}>
                      {c.type.replace('_', ' ')}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: 'var(--omen-text)', maxWidth: '300px' }}>
                      {c.title}
                      {c.rejectionReason && (
                        <p style={{ fontSize: '0.75rem', color: '#8B0000', marginTop: '0.25rem' }}>
                          {c.rejectionReason}
                        </p>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', letterSpacing: '0.08em', color: STATUS_COLORS[c.status] ?? 'var(--omen-muted)' }}>
                      {c.status.toUpperCase()}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: 'var(--omen-text)' }}>
                      {c.rewardAmount != null ? `$${c.rewardAmount.toFixed(2)}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
