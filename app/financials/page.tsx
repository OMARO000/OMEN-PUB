'use client'

import { useState, useEffect, useRef } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────────

interface CompanyFacts {
  cik: string
  name: string
  ticker: string
  revenue: number | null
  revenueHistory: { period: string; value: number }[]
  netIncome: number | null
  profitMargin: number | null
  rnd: number | null
  buybacks: number | null
  taxExpense: number | null
  preTaxIncome: number | null
  effectiveTaxRate: number | null
  filedAt: string | null
  industry: string | null
}

interface OmenViolations {
  total: number
  fineSum: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  return `$${n.toLocaleString()}`
}

function fmtPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`
}

// Returns fraction of query words found in candidate (case-insensitive)
function wordOverlap(query: string, candidate: string): number {
  const qWords = query.toLowerCase().split(/\W+/).filter(Boolean)
  const cLower = candidate.toLowerCase()
  if (qWords.length === 0) return 0
  const matches = qWords.filter((w) => cLower.includes(w))
  return matches.length / qWords.length
}

function latestAnnual(
  facts: Record<string, unknown>,
  ...keys: string[]
): { value: number; end: string } | null {
  for (const key of keys) {
    const data = (facts as Record<string, { units?: { USD?: { form: string; end: string; val: number; accn: string }[] } }>)[key]
    if (!data?.units?.USD) continue
    const annuals = data.units.USD
      .filter((e) => e.form === '10-K')
      .sort((a, b) => b.end.localeCompare(a.end))
    if (annuals.length > 0) return { value: annuals[0].val, end: annuals[0].end }
  }
  return null
}

function recentQuarters(
  facts: Record<string, unknown>,
  ...keys: string[]
): { period: string; value: number }[] {
  for (const key of keys) {
    const data = (facts as Record<string, { units?: { USD?: { form: string; end: string; val: number; fp: string }[] } }>)[key]
    if (!data?.units?.USD) continue
    return data.units.USD
      .filter((e) => e.form === '10-Q' && e.fp)
      .sort((a, b) => b.end.localeCompare(a.end))
      .slice(0, 4)
      .map((e) => ({ period: e.end, value: e.val }))
      .reverse()
  }
  return []
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function FinancialsPage() {
  const [query, setQuery] = useState('')
  const [state, setState] = useState<'search' | 'loading' | 'report' | 'notfound'>('search')
  const [loadingMsg, setLoadingMsg] = useState('')
  const [facts, setFacts] = useState<CompanyFacts | null>(null)
  const [violations, setViolations] = useState<OmenViolations | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Personal calculator state
  const [monthlySpend, setMonthlySpend] = useState('')
  const [yearsCustomer, setYearsCustomer] = useState('')
  const [peerQuery, setPeerQuery] = useState('')

  const loadingMsgs = [
    '> searching SEC EDGAR...',
    '> locating company filings...',
    '> parsing financial data...',
    '> generating report...',
  ]
  const msgIdx = useRef(0)
  const msgTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (msgTimer.current) clearInterval(msgTimer.current)
    }
  }, [])

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setState('loading')
    setError(null)
    setFacts(null)
    setViolations(null)
    msgIdx.current = 0
    setLoadingMsg(loadingMsgs[0])
    msgTimer.current = setInterval(() => {
      msgIdx.current = Math.min(msgIdx.current + 1, loadingMsgs.length - 1)
      setLoadingMsg(loadingMsgs[msgIdx.current])
    }, 1800)

    try {
      // Step 1 — find company CIK via local EDGAR proxy
      const searchRes = await fetch(
        `/api/edgar/search?company=${encodeURIComponent(query.trim())}`,
      )
      const searchData = await searchRes.json()

      let paddedCik: string | null = null
      let entityName: string | null = null
      let firstHitSource: Record<string, unknown> | null = null

      if (searchData.source === 'fulltext' && searchData.hits?.length > 0) {
        firstHitSource = searchData.hits[0]._source
        console.log('[financials] fulltext first hit _source:', JSON.stringify(firstHitSource, null, 2))
        // CIK is in ciks array (index 0), fall back to entity_id or file_num
        const cikSource =
          (firstHitSource?.ciks as string[])?.[0] ??
          firstHitSource?.entity_id ??
          firstHitSource?.file_num ??
          ''
        const rawCik = String(cikSource).replace(/[^0-9]/g, '')
        console.log('[financials] raw CIK extracted:', rawCik)
        if (rawCik) {
          paddedCik = rawCik.padStart(10, '0')
          console.log('[financials] formatted CIK:', paddedCik)
          entityName = (firstHitSource?.display_names as {name:string}[])?.[0]?.name ?? null
        }
      } else if (searchData.source === 'tickers' && searchData.matches?.length > 0) {
        const match = searchData.matches[0]
        console.log('[financials] ticker match:', JSON.stringify(match))
        const rawCik = String(match.cik_str).replace(/[^0-9]/g, '')
        console.log('[financials] raw CIK from ticker:', rawCik)
        paddedCik = rawCik.padStart(10, '0')
        console.log('[financials] formatted CIK:', paddedCik)
        entityName = match.title
      } else {
        console.log('[financials] search returned:', searchData.source, '— no matches')
      }

      if (!paddedCik) {
        if (msgTimer.current) clearInterval(msgTimer.current)
        setState('notfound')
        return
      }

      // Confidence check — reject clearly wrong matches
      if (entityName) {
        const score = wordOverlap(query.trim(), entityName)
        console.log('[financials] match confidence:', score, 'for', entityName)
        if (score < 0.4) {
          if (msgTimer.current) clearInterval(msgTimer.current)
          setError(`No exact match found for "${query.trim()}". Try the official company name — e.g. "Exxon Mobil Corp", "Apple Inc", "Amazon Com Inc".`)
          setState('search')
          return
        }
      }

      // Step 2 — fetch company facts via local EDGAR proxy
      const factsRes = await fetch(`/api/edgar/facts?cik=${paddedCik}`)
      if (!factsRes.ok) {
        if (msgTimer.current) clearInterval(msgTimer.current)
        setState('notfound')
        return
      }
      const factsJson = await factsRes.json()
      const usgaap = factsJson.facts?.['us-gaap'] ?? {}

      const revEntry = latestAnnual(usgaap, 'Revenues', 'RevenueFromContractWithCustomerExcludingAssessedTax', 'SalesRevenueNet')
      const niEntry = latestAnnual(usgaap, 'NetIncomeLoss')
      const rndEntry = latestAnnual(usgaap, 'ResearchAndDevelopmentExpense')
      const buyEntry = latestAnnual(usgaap, 'PaymentsForRepurchaseOfCommonStock')
      const taxEntry = latestAnnual(usgaap, 'IncomeTaxExpenseBenefit')
      const preTaxEntry = latestAnnual(usgaap, 'IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest')

      const rev = revEntry?.value ?? null
      const ni = niEntry?.value ?? null
      const rnd = rndEntry?.value ?? null
      const buybacks = buyEntry?.value ?? null
      const taxExpense = taxEntry?.value ?? null
      const preTaxIncome = preTaxEntry?.value ?? null
      const effectiveTaxRate = taxExpense && preTaxIncome && preTaxIncome !== 0
        ? taxExpense / preTaxIncome
        : null
      const profitMargin = rev && ni && rev !== 0 ? ni / rev : null
      const quarters = recentQuarters(usgaap, 'Revenues', 'RevenueFromContractWithCustomerExcludingAssessedTax', 'SalesRevenueNet')

      const parsed: CompanyFacts = {
        cik: paddedCik,
        name: factsJson.entityName ?? entityName ?? query.trim().toUpperCase(),
        ticker: (firstHitSource?.period_of_report as string) ?? '',
        revenue: rev,
        revenueHistory: quarters,
        netIncome: ni,
        profitMargin,
        rnd,
        buybacks,
        taxExpense,
        preTaxIncome,
        effectiveTaxRate,
        filedAt: revEntry?.end ?? null,
        industry: null,
      }

      // Step 3 — query OMEN ledger for violations
      try {
        const vRes = await fetch(`/api/violations-summary?name=${encodeURIComponent(parsed.name)}`)
        if (vRes.ok) {
          const vData = await vRes.json()
          setViolations(vData)
        }
      } catch {
        // violations optional — no-op
      }

      if (msgTimer.current) clearInterval(msgTimer.current)
      setFacts(parsed)
      setState('report')
    } catch {
      if (msgTimer.current) clearInterval(msgTimer.current)
      setError('Failed to fetch data from SEC EDGAR. Try again.')
      setState('search')
    }
  }

  // ── Personal calculator derived values ──────────────────────────────────────

  const monthly = parseFloat(monthlySpend) || 0
  const years = parseFloat(yearsCustomer) || 0
  const totalSpent = monthly * 12 * years
  // Rough avg customers: revenue / $500 annual spend per customer
  const estCustomers = facts?.revenue ? facts.revenue / 500 : null
  const revenuePerCustomer = facts?.revenue && estCustomers ? facts.revenue / estCustomers : null
  const customerPct = revenuePerCustomer && monthly > 0
    ? ((monthly * 12) / revenuePerCustomer) * 100
    : null

  // CEO pay ratio: placeholder — DEF 14A not in XBRL; show note
  const ceoPay = null // sourced from proxy statement, not available via XBRL

  // ── Render ──────────────────────────────────────────────────────────────────

  const S = {
    page: {
      padding: '2rem',
      maxWidth: '760px',
      fontFamily: 'var(--font-ibm-plex-mono), ui-monospace, monospace',
    } as React.CSSProperties,
    heading: {
      fontSize: '1rem',
      letterSpacing: '0.12em',
      color: 'var(--omen-text)',
      margin: '0 0 0.5rem',
    } as React.CSSProperties,
    muted: {
      fontSize: '0.75rem',
      color: 'var(--omen-muted)',
      letterSpacing: '0.04em',
    } as React.CSSProperties,
    input: {
      background: 'transparent',
      border: '1px solid var(--omen-border)',
      color: 'var(--omen-text)',
      fontFamily: 'inherit',
      fontSize: '0.9rem',
      padding: '0.5rem 0.75rem',
      outline: 'none',
      width: '100%',
    } as React.CSSProperties,
    btn: {
      background: 'transparent',
      border: '1px solid var(--omen-accent)',
      color: 'var(--omen-accent)',
      fontFamily: 'inherit',
      fontSize: '0.8rem',
      letterSpacing: '0.08em',
      padding: '0.5rem 1rem',
      cursor: 'pointer',
      whiteSpace: 'nowrap',
    } as React.CSSProperties,
    divider: {
      border: 'none',
      borderTop: '1px solid var(--omen-border)',
      margin: '1.5rem 0',
    } as React.CSSProperties,
    sectionLabel: {
      fontSize: '0.65rem',
      letterSpacing: '0.18em',
      color: 'var(--omen-muted)',
      margin: '0 0 1rem',
    } as React.CSSProperties,
    metric: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '0.25rem',
    },
    metricValue: {
      fontSize: '1.6rem',
      fontWeight: 700,
      letterSpacing: '0.02em',
      color: 'var(--omen-text)',
    } as React.CSSProperties,
    metricLabel: {
      fontSize: '0.7rem',
      color: 'var(--omen-muted)',
      letterSpacing: '0.04em',
    } as React.CSSProperties,
    green: { color: '#4CAF7D' } as React.CSSProperties,
    red: { color: 'var(--tag-ugly)' } as React.CSSProperties,
    amber: { color: 'var(--tag-broken-promise)' } as React.CSSProperties,
  }

  // ── Search state ─────────────────────────────────────────────────────────────

  if (state === 'search' || state === 'notfound') {
    return (
      <div style={S.page}>
        <p style={S.sectionLabel}>OMEN / FINANCIAL FOOTPRINT</p>
        <h1 style={{ ...S.heading, fontSize: '1.4rem', marginBottom: '0.25rem' }}>[ FINANCIAL FOOTPRINT ]</h1>
        <p style={{ ...S.muted, marginBottom: '2rem' }}>
          Enter a company name to generate their financial report.
        </p>

        {state === 'notfound' && (
          <div style={{ border: '1px solid var(--omen-border)', padding: '1rem', marginBottom: '1.5rem', ...S.muted }}>
            {query.toUpperCase()} — Financial data not publicly available. This company is not required to
            disclose financials to the SEC, or no filings were found.
          </div>
        )}

        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <input
            style={S.input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. Apple Inc, Amazon, ExxonMobil"
            autoFocus
          />
          <button type="submit" style={S.btn}>[ search ]</button>
        </form>

        <p style={S.muted}>Data sourced from SEC EDGAR. Public companies only.</p>
        {error && <p style={{ ...S.muted, color: 'var(--tag-ugly)', marginTop: '0.75rem' }}>{error}</p>}
      </div>
    )
  }

  // ── Loading state ─────────────────────────────────────────────────────────────

  if (state === 'loading') {
    return (
      <div style={S.page}>
        <p style={S.sectionLabel}>OMEN / FINANCIAL FOOTPRINT</p>
        <div style={{ color: 'var(--omen-accent)', fontSize: '0.9rem', letterSpacing: '0.04em', marginTop: '2rem' }}>
          {loadingMsg}
          <span style={{ animation: 'none' }}>_</span>
        </div>
      </div>
    )
  }

  // ── Report state ──────────────────────────────────────────────────────────────

  if (!facts) return null

  const trendArrow = (curr: number, prev: number) =>
    curr >= prev ? <span style={S.green}>↑</span> : <span style={S.red}>↓</span>

  const taxDiff = facts.effectiveTaxRate != null ? facts.effectiveTaxRate - 0.21 : null
  const taxNote = facts.effectiveTaxRate != null
    ? facts.effectiveTaxRate < 0.15
      ? 'Well below the statutory rate. This company pays significantly less than the 21% corporate rate.'
      : facts.effectiveTaxRate < 0.21
        ? 'Below the statutory 21% rate, likely due to deductions, credits, or offshore structuring.'
        : facts.effectiveTaxRate < 0.28
          ? 'Near or at the statutory rate. No significant tax avoidance visible in reported figures.'
          : 'Above the statutory rate. May reflect deferred tax liabilities or one-time charges.'
    : null

  return (
    <div style={S.page}>
      {/* Back link */}
      <button
        onClick={() => { setState('search'); setFacts(null) }}
        style={{ ...S.muted, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: '1.5rem', fontFamily: 'inherit' }}
      >
        [ back to search ]
      </button>

      {/* ── HEADER ── */}
      <h1 style={{ fontSize: '1.8rem', fontWeight: 700, letterSpacing: '0.1em', margin: '0 0 0.25rem' }}>
        {facts.name.toUpperCase()}
      </h1>
      {facts.industry && <p style={S.muted}>{facts.industry}</p>}
      {facts.filedAt && (
        <p style={S.muted}>Last updated: {facts.filedAt}</p>
      )}

      <hr style={S.divider} />

      {/* ── SECTION 1 — THE BASICS ── */}
      <p style={S.sectionLabel}>SECTION 1 — THE BASICS</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={S.metric}>
          <span style={S.metricValue}>{facts.revenue != null ? fmt(facts.revenue) : '—'}</span>
          <span style={S.metricLabel}>Annual Revenue</span>
          <span style={{ ...S.muted, fontSize: '0.65rem' }}>Total money coming in last year</span>
        </div>
        <div style={S.metric}>
          <span style={{ ...S.metricValue, ...(facts.netIncome != null && facts.netIncome < 0 ? S.red : S.green) }}>
            {facts.netIncome != null ? fmt(facts.netIncome) : '—'}
          </span>
          <span style={S.metricLabel}>Net Income</span>
          <span style={{ ...S.muted, fontSize: '0.65rem' }}>What they actually kept after expenses</span>
        </div>
        <div style={S.metric}>
          <span style={{ ...S.metricValue, ...(facts.profitMargin != null && facts.profitMargin < 0 ? S.red : {}) }}>
            {facts.profitMargin != null ? fmtPct(facts.profitMargin) : '—'}
          </span>
          <span style={S.metricLabel}>Profit Margin</span>
          <span style={{ ...S.muted, fontSize: '0.65rem' }}>
            {facts.profitMargin != null
              ? `Out of every $100 they made, they kept $${(facts.profitMargin * 100).toFixed(2)}`
              : 'Out of every $100 they made, they kept $—'}
          </span>
        </div>
        <div style={S.metric}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            {facts.revenueHistory.length > 1
              ? facts.revenueHistory.map((q, i) => (
                  <span key={`${q.period}-${i}`} style={{ fontSize: '0.8rem', color: 'var(--omen-text)' }}>
                    {i > 0 && trendArrow(q.value, facts.revenueHistory[i - 1].value)}{' '}
                    {fmt(q.value)}{' '}
                    <span style={S.muted}>{q.period.slice(0, 7)}</span>
                  </span>
                ))
              : <span style={S.muted}>insufficient quarterly data</span>
            }
          </div>
          <span style={S.metricLabel}>Revenue Trend</span>
          <span style={{ ...S.muted, fontSize: '0.65rem' }}>Growing or shrinking?</span>
        </div>
      </div>

      <hr style={S.divider} />

      {/* ── SECTION 2 — WHERE THE MONEY GOES ── */}
      <p style={S.sectionLabel}>SECTION 2 — WHERE THE MONEY GOES</p>

      {/* Buybacks vs R&D */}
      <div style={{ marginBottom: '1.5rem' }}>
        <p style={{ ...S.muted, marginBottom: '0.75rem', fontSize: '0.7rem' }}>
          Buybacks = rewarding shareholders. R&D = building the future. Here&apos;s where they chose to put it.
        </p>
        {(facts.buybacks != null || facts.rnd != null) ? (() => {
          const b = facts.buybacks ?? 0
          const r = facts.rnd ?? 0
          const total = b + r
          const bPct = total > 0 ? (b / total) * 100 : 50
          const rPct = total > 0 ? (r / total) * 100 : 50
          return (
            <div>
              <div style={{ display: 'flex', height: '12px', marginBottom: '0.5rem' }}>
                <div style={{ width: `${bPct}%`, background: 'var(--tag-broken-promise)' }} title={`Buybacks ${fmt(b)}`} />
                <div style={{ width: `${rPct}%`, background: 'var(--omen-accent)' }} title={`R&D ${fmt(r)}`} />
              </div>
              <div style={{ display: 'flex', gap: '1.5rem' }}>
                <span style={{ ...S.muted, fontSize: '0.7rem' }}>
                  <span style={{ color: 'var(--tag-broken-promise)' }}>■</span> Buybacks: {fmt(b)} ({bPct.toFixed(0)}%)
                </span>
                <span style={{ ...S.muted, fontSize: '0.7rem' }}>
                  <span style={S.green}>■</span> R&D: {fmt(r)} ({rPct.toFixed(0)}%)
                </span>
              </div>
            </div>
          )
        })() : <span style={S.muted}>data not available</span>}
      </div>

      {/* Tax rate */}
      <div style={{ marginBottom: '1.5rem' }}>
        <span style={{ fontSize: '1.6rem', fontWeight: 700, color: taxDiff != null && taxDiff < -0.05 ? 'var(--tag-ugly)' : 'var(--omen-text)' }}>
          {facts.effectiveTaxRate != null ? fmtPct(facts.effectiveTaxRate) : '—'}
        </span>
        <p style={{ ...S.metricLabel, marginTop: '0.25rem' }}>Effective Tax Rate</p>
        <p style={{ ...S.muted, fontSize: '0.7rem', marginTop: '0.25rem' }}>
          The US corporate tax rate is 21%.{' '}
          {facts.effectiveTaxRate != null ? `This company paid ${fmtPct(facts.effectiveTaxRate)}.` : ''}{' '}
          {taxNote}
        </p>
      </div>

      {/* CEO pay ratio */}
      <div style={{ marginBottom: '1.5rem' }}>
        <span style={{ ...S.metricValue }}>
          {ceoPay != null ? `$${ceoPay}` : 'not disclosed'}
        </span>
        <p style={{ ...S.metricLabel, marginTop: '0.25rem' }}>CEO Pay Ratio</p>
        <p style={{ ...S.muted, fontSize: '0.7rem', marginTop: '0.25rem' }}>
          What the person at the top makes compared to everyone else. Sourced from proxy statement (DEF 14A) — not available via XBRL.
        </p>
      </div>

      <hr style={S.divider} />

      {/* ── SECTION 3 — YOUR RELATIONSHIP ── */}
      <style>{`
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>
      <p style={S.sectionLabel}>SECTION 3 — YOUR RELATIONSHIP TO THIS COMPANY</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <label style={S.muted}>
          How much do you spend with this company per month? $
          <input
            type="number"
            min="0"
            value={monthlySpend}
            onChange={(e) => setMonthlySpend(e.target.value)}
            style={{ background: 'transparent', border: '1px solid var(--omen-border)', color: 'var(--omen-muted)', fontFamily: 'inherit', fontSize: '0.9rem', padding: '0.3rem 0.5rem', outline: 'none', width: '100px', display: 'inline-block', marginLeft: '0.5rem' }}
            placeholder="0"
          />
        </label>
        <label style={S.muted}>
          How many years have you been a customer?
          <input
            type="number"
            min="0"
            value={yearsCustomer}
            onChange={(e) => setYearsCustomer(e.target.value)}
            style={{ background: 'transparent', border: '1px solid var(--omen-border)', color: 'var(--omen-muted)', fontFamily: 'inherit', fontSize: '0.9rem', padding: '0.3rem 0.5rem', outline: 'none', width: '80px', display: 'inline-block', marginLeft: '0.5rem' }}
            placeholder="0"
          />
        </label>
        <label style={S.muted}>
          Compare to another company:
          <input
            type="text"
            value={peerQuery}
            onChange={(e) => setPeerQuery(e.target.value)}
            style={{ background: 'transparent', border: '1px solid var(--omen-border)', color: 'var(--omen-muted)', fontFamily: 'inherit', fontSize: '0.9rem', padding: '0.3rem 0.5rem', outline: 'none', width: '200px', display: 'inline-block', marginLeft: '0.5rem' }}
            placeholder="e.g. Microsoft"
          />
        </label>
      </div>

      {monthly > 0 && (
        <div style={{ border: '1px solid var(--omen-border)', padding: '1rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {customerPct != null && (
            <p style={S.muted}>
              Your ${monthly}/month = <span style={{ color: 'var(--omen-text)' }}>{customerPct.toFixed(4)}%</span> of estimated annual revenue per customer
            </p>
          )}
          {totalSpent > 0 && (
            <p style={S.muted}>
              Over {years} year{years !== 1 ? 's' : ''}, you&apos;ve contributed an estimated{' '}
              <span style={{ color: 'var(--omen-text)' }}>{fmt(totalSpent)}</span> to this company
            </p>
          )}
          <p style={{ ...S.muted, fontSize: '0.65rem' }}>CEO pay ratio data not available — cannot calculate salary comparison</p>
        </div>
      )}

      <hr style={S.divider} />

      {/* ── SECTION 4 — THE RECEIPT ── */}
      <p style={S.sectionLabel}>SECTION 4 — THE RECEIPT</p>
      <p style={{ ...S.muted, marginBottom: '1rem' }}>What accountability cost them</p>

      {violations ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {violations.fineSum > 0 ? (
            <>
              <p style={S.muted}>
                Total fines on record: <span style={{ color: 'var(--tag-ugly)', fontSize: '1.2rem' }}>{fmt(violations.fineSum)}</span>
              </p>
              {facts.revenue && (
                <>
                  <p style={S.muted}>
                    That represents{' '}
                    <span style={{ color: 'var(--omen-text)' }}>{fmtPct(violations.fineSum / facts.revenue)}</span>{' '}
                    of their annual revenue
                  </p>
                  <p style={{ ...S.muted, fontSize: '0.7rem' }}>
                    In other words, for every $100 they made, they paid ${((violations.fineSum / facts.revenue) * 100).toFixed(4)} in fines and penalties
                  </p>
                </>
              )}
            </>
          ) : (
            <p style={S.muted}>No violations on record in OMEN ledger</p>
          )}
        </div>
      ) : (
        <p style={S.muted}>No violations on record in OMEN ledger</p>
      )}
    </div>
  )
}
