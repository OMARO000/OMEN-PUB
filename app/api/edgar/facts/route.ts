import { NextRequest, NextResponse } from 'next/server'
import { edgarFetch } from '../lib/edgarFetch'

export async function GET(req: NextRequest) {
  const cik = req.nextUrl.searchParams.get('cik')
  if (!cik?.trim()) {
    return NextResponse.json({ error: 'cik parameter required' }, { status: 400 })
  }

  const paddedCik = cik.trim().replace(/^0+/, '').padStart(10, '0')
  const url = `https://data.sec.gov/api/xbrl/companyfacts/CIK${paddedCik}.json`

  const res = await edgarFetch(url)

  if (!res.ok) {
    return NextResponse.json(
      { error: `EDGAR returned ${res.status}` },
      { status: res.status },
    )
  }

  const data = await res.json()
  return NextResponse.json(data)
}
