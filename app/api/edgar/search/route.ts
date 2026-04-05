import { NextRequest, NextResponse } from 'next/server'
import https from 'https'

// Note: httpsAgent disables SSL verification for local dev only.
// On Vercel (production) Node's native fetch is used and this agent is not applied.
const httpsAgent = new https.Agent({ rejectUnauthorized: false })

const EDGAR_HEADERS = {
  'User-Agent': 'OMARO hello@omaro-pbc.org',
  'Accept': 'application/json',
}

// Returns fraction of query words found in candidate (case-insensitive)
function wordOverlap(query: string, candidate: string): number {
  const qWords = query.toLowerCase().split(/\W+/).filter(Boolean)
  const cLower = candidate.toLowerCase()
  if (qWords.length === 0) return 0
  return qWords.filter((w) => cLower.includes(w)).length / qWords.length
}

export async function GET(req: NextRequest) {
  const company = req.nextUrl.searchParams.get('company')
  console.log('[edgar/search] company received:', company)

  if (!company?.trim()) {
    return NextResponse.json({ error: 'company parameter required' }, { status: 400 })
  }

  const q = encodeURIComponent(`"${company.trim()}"`)
  const ftUrl = `https://efts.sec.gov/LATEST/search-index?q=${q}&forms=10-K`
  console.log('[edgar/search] fetching:', ftUrl)

  try {
    const ftRes = await fetch(ftUrl, {
      headers: EDGAR_HEADERS,
      // @ts-ignore
      agent: httpsAgent,
    })
    console.log('[edgar/search] status:', ftRes.status)

    if (ftRes.ok) {
      const data = await ftRes.json()
      const hits: unknown[] = data?.hits?.hits ?? []
      console.log('[edgar/search] total hits:', hits.length)

      if (hits.length > 0) {
        console.log('[edgar/search] first hit _source:', JSON.stringify((hits[0] as Record<string, unknown>)._source, null, 2))

        // Score each hit by word overlap between query and display_names[0]
        type Hit = {
          _source: {
            display_names?: { name: string }[]
            entity_name?: string
            ciks?: string[]
            period_of_report?: string
          }
        }

        const scored = (hits as Hit[])
          .map((hit) => {
            const src = hit._source
            const displayName = src.display_names?.[0]?.name ?? src.entity_name ?? ''
            const score = wordOverlap(company.trim(), displayName)
            return { src, displayName, score, cik: src.ciks?.[0] ?? null }
          })
          .filter((h) => h.cik)
          .sort((a, b) => b.score - a.score)

        console.log('[edgar/search] top scored matches:',
          scored.slice(0, 3).map((h) => `${h.displayName} (${h.score.toFixed(2)})`))

        if (scored.length > 0) {
          const best = scored[0]
          return NextResponse.json({
            source: 'fulltext',
            bestMatch: {
              name: best.displayName,
              cik: best.cik,
              score: best.score,
            },
            hits: scored.map((h) => ({
              _source: h.src,
              _score: h.score,
            })),
          })
        }
      }
    }
  } catch (err) {
    console.error('[edgar/search] fetch error:', err)
  }

  // Fallback: tickers JSON
  const tickersUrl = 'https://www.sec.gov/files/company_tickers.json'
  console.log('[edgar/search] falling back to tickers JSON')

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

      // Score all entries and return the best match
      const scored = all
        .map((c) => ({ ...c, score: wordOverlap(company.trim(), c.title) }))
        .filter((c) => c.score > 0)
        .sort((a, b) => b.score - a.score)

      console.log('[edgar/search] top ticker matches:',
        scored.slice(0, 3).map((c) => `${c.title} (${c.score.toFixed(2)})`))

      if (scored.length > 0) {
        return NextResponse.json({ source: 'tickers', matches: scored.slice(0, 10) })
      }
    }
  } catch (err) {
    console.error('[edgar/search] tickers fetch error:', err)
  }

  console.log('[edgar/search] no results found')
  return NextResponse.json({ source: 'none', hits: [], matches: [] })
}
