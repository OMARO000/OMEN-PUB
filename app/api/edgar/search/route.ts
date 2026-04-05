import { NextRequest, NextResponse } from 'next/server'
import https from 'https'

// Note: httpsAgent disables SSL verification for local dev only.
// On Vercel (production) Node's native fetch is used and this agent is not applied.
const httpsAgent = new https.Agent({ rejectUnauthorized: false })

const EDGAR_HEADERS = {
  'User-Agent': 'OMARO hello@omaro-pbc.org',
  'Accept': 'application/json',
}

// Returns fraction of query words found in candidate title (case-insensitive)
function wordOverlap(query: string, candidate: string): number {
  const qWords = query.toLowerCase().split(/\W+/).filter(Boolean)
  const cWords = candidate.toLowerCase().split(/\W+/).filter(Boolean)
  if (qWords.length === 0) return 0
  const matched = qWords.filter((w) => cWords.includes(w))
  return matched.length / qWords.length
}

// Extract clean name and ticker from EDGAR display_names string
// e.g. "Apple Hospitality REIT, Inc.  (APLE)  (CIK 0001418121)"
function parseDisplayName(raw: string): { name: string; ticker: string } {
  const parts = raw.split(/\s{2,}\(/)
  const name = parts[0]?.trim() ?? raw
  const tickerMatch = raw.match(/\(([A-Z]{1,5})\)\s+\(CIK/)
  const ticker = tickerMatch?.[1] ?? ''
  return { name, ticker }
}

export async function GET(req: NextRequest) {
  const company = req.nextUrl.searchParams.get('company')
  console.log('[edgar/search] company received:', company)

  if (!company?.trim()) {
    return NextResponse.json({ error: 'company parameter required' }, { status: 400 })
  }

  // Primary: EDGAR company tickers JSON — most reliable, fully case-insensitive
  const tickersUrl = 'https://www.sec.gov/files/company_tickers.json'
  console.log('[edgar/search] fetching tickers JSON')

  try {
    const tickersRes = await fetch(tickersUrl, {
      headers: EDGAR_HEADERS,
      // @ts-ignore
      agent: httpsAgent,
      next: { revalidate: 86400 },
    })
    console.log('[edgar/search] tickers status:', tickersRes.status)

    if (tickersRes.ok) {
      const tickers: Record<string, { cik_str: number; ticker: string; title: string }> = await tickersRes.json()
      const all = Object.values(tickers)

      const scored = all
        .map((c) => ({ ...c, score: wordOverlap(company.trim(), c.title) }))
        .filter((c) => c.score > 0)
        .sort((a, b) => b.score - a.score)

      console.log('[edgar/search] top ticker matches:',
        scored.slice(0, 5).map((c) => `${c.title} [${c.ticker}] (${c.score.toFixed(2)})`))

      if (scored.length > 0) {
        // Deduplicate by CIK — keep highest-scored entry per CIK
        const seen = new Set<string>()
        const deduped = scored.filter((c) => {
          const cik = String(c.cik_str).padStart(10, '0')
          if (seen.has(cik)) return false
          seen.add(cik)
          return true
        })
        return NextResponse.json({
          source: 'tickers',
          matches: deduped.slice(0, 20).map((c) => ({
            name: c.title,
            cik: String(c.cik_str).padStart(10, '0'),
            ticker: c.ticker,
            score: c.score,
          })),
        })
      }
    }
  } catch (err) {
    console.error('[edgar/search] tickers fetch error:', err)
  }

  // Fallback: EDGAR fulltext search
  const q = encodeURIComponent(`"${company.trim()}"`)
  const ftUrl = `https://efts.sec.gov/LATEST/search-index?q=${q}&forms=10-K`
  console.log('[edgar/search] falling back to fulltext:', ftUrl)

  try {
    const ftRes = await fetch(ftUrl, {
      headers: EDGAR_HEADERS,
      // @ts-ignore
      agent: httpsAgent,
    })
    console.log('[edgar/search] fulltext status:', ftRes.status)

    if (ftRes.ok) {
      const data = await ftRes.json()
      const hits: unknown[] = data?.hits?.hits ?? []
      console.log('[edgar/search] fulltext hits:', hits.length)

      if (hits.length > 0) {
        type Hit = {
          _source: {
            display_names?: string[]
            entity_name?: string
            ciks?: string[]
            tickers?: string[]
          }
        }

        const firstSrc = (hits[0] as Hit)._source
        console.log('[edgar/search] display_names[0] raw:', firstSrc.display_names?.[0])
        console.log('[edgar/search] entity_name raw:', firstSrc.entity_name)

        const scored = (hits as Hit[])
          .map((hit) => {
            const src = hit._source
            // display_names[0] is a string like "Apple Inc  (AAPL)  (CIK 0000320193)"
            const rawDisplayName = src.display_names?.[0] ?? src.entity_name ?? ''
            const { name, ticker } = parseDisplayName(rawDisplayName)
            const score = wordOverlap(company.trim(), name)
            const cik = src.ciks?.[0] ?? null
            return { name, ticker: ticker || (src.tickers?.[0] ?? ''), score, cik }
          })
          .filter((h) => h.cik)
          .sort((a, b) => b.score - a.score)

        console.log('[edgar/search] top fulltext matches:',
          scored.slice(0, 3).map((h) => `${h.name} [${h.ticker}] (${h.score.toFixed(2)})`))

        if (scored.length > 0) {
          // Deduplicate by CIK
          const seen = new Set<string>()
          const deduped = scored.filter((h) => {
            const cik = String(h.cik).replace(/[^0-9]/g, '').padStart(10, '0')
            if (seen.has(cik)) return false
            seen.add(cik)
            return true
          })
          return NextResponse.json({
            source: 'fulltext',
            matches: deduped.slice(0, 20).map((h) => ({
              name: h.name,
              cik: String(h.cik).replace(/[^0-9]/g, '').padStart(10, '0'),
              ticker: h.ticker,
              score: h.score,
            })),
          })
        }
      }
    }
  } catch (err) {
    console.error('[edgar/search] fulltext fetch error:', err)
  }

  console.log('[edgar/search] no results found')
  return NextResponse.json({ source: 'none', hits: [], matches: [] })
}
