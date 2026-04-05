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
  const cik = req.nextUrl.searchParams.get('cik')
  if (!cik?.trim()) {
    return NextResponse.json({ error: 'cik parameter required' }, { status: 400 })
  }

  const paddedCik = cik.trim().replace(/^0+/, '').padStart(10, '0')
  const url = `https://data.sec.gov/api/xbrl/companyfacts/CIK${paddedCik}.json`

  const res = await fetch(url, {
    headers: EDGAR_HEADERS,
    // @ts-ignore
    agent: httpsAgent,
  })

  if (!res.ok) {
    return NextResponse.json(
      { error: `EDGAR returned ${res.status}` },
      { status: res.status },
    )
  }

  const data = await res.json()
  return NextResponse.json(data)
}
