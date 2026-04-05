import { NextRequest, NextResponse } from 'next/server'
import https from 'https'

// Note: httpsAgent disables SSL verification for local dev only.
// On Vercel (production) Node's native fetch is used and this agent is not applied.
const httpsAgent = new https.Agent({ rejectUnauthorized: false })

const EDGAR_HEADERS = {
  'User-Agent': 'OMARO hello@omaro-pbc.org',
  'Accept': 'application/json',
}

export async function GET(req: NextRequest) {
  const company = req.nextUrl.searchParams.get('company')
  console.log('[edgar/search] company received:', company)

  if (!company?.trim()) {
    return NextResponse.json({ error: 'company parameter required' }, { status: 400 })
  }

  const q_lower = company.trim().toLowerCase()

  // Primary: EDGAR company tickers JSON — contains every public company with CIK + ticker
  const tickersUrl = 'https://www.sec.gov/files/company_tickers.json'
  console.log('[edgar/search] fetching tickers JSON:', tickersUrl)

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

      // Exact ticker match first, then title includes
      const all = Object.values(tickers)
      const exactTicker = all.find((c) => c.ticker.toLowerCase() === q_lower)
      const titleMatches = all.filter((c) => c.title.toLowerCase().includes(q_lower))
      const matches = exactTicker
        ? [exactTicker, ...titleMatches.filter((c) => c.cik_str !== exactTicker.cik_str)]
        : titleMatches

      console.log('[edgar/search] ticker matches:', matches.length)
      if (matches.length > 0) {
        console.log('[edgar/search] top match:', JSON.stringify(matches[0]))
        return NextResponse.json({ source: 'tickers', matches: matches.slice(0, 10) })
      }
    }
  } catch (err) {
    console.error('[edgar/search] tickers fetch error:', err)
  }

  // Fallback: EDGAR fulltext search
  const q = encodeURIComponent(`"${company.trim()}"`)
  const ftUrl = `https://efts.sec.gov/LATEST/search-index?q=${q}&forms=10-K&dateRange=custom&startdt=2022-01-01&enddt=2025-12-31&hits.hits._source=display_names,ciks,file_num`
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
      const hits = data?.hits?.hits ?? []
      console.log('[edgar/search] fulltext hits:', hits.length)
      if (hits.length > 0) {
        console.log('[edgar/search] first hit _source:', JSON.stringify(hits[0]._source, null, 2))
        return NextResponse.json({ source: 'fulltext', hits })
      }
    }
  } catch (err) {
    console.error('[edgar/search] fulltext fetch error:', err)
  }

  console.log('[edgar/search] no results found')
  return NextResponse.json({ source: 'none', hits: [], matches: [] })
}
