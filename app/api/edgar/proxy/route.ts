import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import https from 'https'
import { edgarFetch } from '../lib/edgarFetch'

type ProxyResult = {
  ratio: number | null
  method: 'regex_ratio' | 'regex_times' | 'calculated' | 'claude' | 'not_found'
  filingUrl: string
  filingDate: string
  rawText: string
}

// ── Strategy 1 — Ratio pattern (e.g. "312 to 1", "312:1") ──────────────────
function extractRatioPattern(text: string): number | null {
  const patterns = [
    /(\d[\d,]+)\s*(?:to|:)\s*1\b/gi,
    /(\d[\d,]+)\s*-\s*to\s*-\s*1\b/gi,
  ]
  const found: number[] = []
  for (const re of patterns) {
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      const n = parseInt(m[1].replace(/,/g, ''), 10)
      if (n > 1 && n < 10000) found.push(n)
    }
  }
  return found.length > 0 ? Math.max(...found) : null
}

// ── Strategy 2 — Times/multiple pattern ────────────────────────────────────
function extractTimesPattern(text: string): number | null {
  const patterns = [
    /(?:ceo|chief executive|mr\.|ms\.)[^.]{0,200}?(\d[\d,]+)\s*times/gi,
    /(\d[\d,]+)\s*times\s*(?:the\s*)?(?:median|average)/gi,
  ]
  const found: number[] = []
  for (const re of patterns) {
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      const n = parseInt(m[1].replace(/,/g, ''), 10)
      if (n > 1 && n < 10000) found.push(n)
    }
  }
  return found.length > 0 ? Math.max(...found) : null
}

// ── Strategy 3 — Calculate from raw dollar figures ─────────────────────────
function extractCalculated(text: string): number | null {
  const medianRe = /median\s+annual\s+total\s+compensation[^$]{0,100}\$([\d,]+)/gi
  const ceoRe = /chief\s+executive[^$]{0,100}\$([\d,]+(?:\.\d+)?)\s*(?:million|billion)?/gi

  const medianMatches: number[] = []
  const ceoMatches: number[] = []

  let m: RegExpExecArray | null
  while ((m = medianRe.exec(text)) !== null) {
    medianMatches.push(parseInt(m[1].replace(/,/g, ''), 10))
  }
  while ((m = ceoRe.exec(text)) !== null) {
    const raw = parseFloat(m[1].replace(/,/g, ''))
    // handle "million" / "billion" suffix in the surrounding text
    const suffix = m[0].toLowerCase()
    const val = suffix.includes('million') ? raw * 1e6 : suffix.includes('billion') ? raw * 1e9 : raw
    if (val > 1000) ceoMatches.push(val)
  }

  if (medianMatches.length > 0 && ceoMatches.length > 0) {
    const median = Math.min(...medianMatches)
    const ceo = Math.max(...ceoMatches)
    const ratio = Math.round(ceo / median)
    if (ratio > 1 && ratio < 10000) return ratio
  }
  return null
}

// ── Strategy 4 — Claude API fallback ───────────────────────────────────────
async function extractViaClaude(excerpt: string): Promise<number | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null
  try {
    const client = new Anthropic({
      ...(process.env.NODE_ENV !== 'production' && {
        httpAgent: new https.Agent({ rejectUnauthorized: false })
      })
    })
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 100,
      system: 'You extract CEO to median employee pay ratios from SEC proxy filings. Return ONLY a number representing the ratio (e.g. "312" for 312:1). If you cannot find a clear ratio, return "NOT_FOUND".',
      messages: [{ role: 'user', content: excerpt }],
    })
    const text = (msg.content[0] as { type: string; text: string }).text?.trim()
    if (text === 'NOT_FOUND') return null
    const n = parseInt(text, 10)
    return !isNaN(n) && n > 1 && n < 10000 ? n : null
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const cik = req.nextUrl.searchParams.get('cik')
  if (!cik?.trim()) {
    return NextResponse.json({ error: 'cik parameter required' }, { status: 400 })
  }

  const paddedCik = cik.trim().replace(/^0+/, '').padStart(10, '0')
  const numericCik = paddedCik.replace(/^0+/, '')

  // Step 1 — find most recent DEF 14A in submissions
  const subUrl = `https://data.sec.gov/submissions/CIK${paddedCik}.json`
  let filingAccession: string | null = null
  let filingDoc: string | null = null
  let filingDate = ''

  try {
    const subRes = await edgarFetch(subUrl)
    if (!subRes.ok) {
      return NextResponse.json({ ratio: null, method: 'not_found', filingUrl: '', filingDate: '', rawText: '' })
    }
    const subJson = await subRes.json()

    const filings = subJson.filings?.recent
    if (filings) {
      const forms: string[] = filings.form ?? []
      const accessions: string[] = filings.accessionNumber ?? []
      const docs: string[] = filings.primaryDocument ?? []
      const dates: string[] = filings.filingDate ?? []

      for (let i = 0; i < forms.length; i++) {
        if (forms[i] === 'DEF 14A') {
          filingAccession = accessions[i]
          filingDoc = docs[i]
          filingDate = dates[i] ?? ''
          break
        }
      }
    }
  } catch (err) {
    console.error('[edgar/proxy] submissions fetch error:', err)
    return NextResponse.json({ ratio: null, method: 'not_found', filingUrl: '', filingDate: '', rawText: '' })
  }

  if (!filingAccession || !filingDoc) {
    return NextResponse.json({ ratio: null, method: 'not_found', filingUrl: '', filingDate: '', rawText: 'No DEF 14A filing found' })
  }

  const accForUrl = filingAccession.replace(/-/g, '')
  const filingUrl = `https://www.sec.gov/Archives/edgar/data/${numericCik}/${accForUrl}/${filingDoc}`

  // Step 2 — fetch the filing document
  let docText = ''
  try {
    const docRes = await edgarFetch(filingUrl)
    if (!docRes.ok) {
      return NextResponse.json({ ratio: null, method: 'not_found', filingUrl, filingDate, rawText: `HTTP ${docRes.status}` })
    }
    // Strip HTML tags for text analysis
    const raw = await docRes.text()
    docText = raw.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ')
  } catch (err) {
    console.error('[edgar/proxy] filing fetch error:', err)
    return NextResponse.json({ ratio: null, method: 'not_found', filingUrl, filingDate, rawText: '' })
  }

  // Step 3 — extract pay ratio using layered strategies

  // Strategy 1
  const s1 = extractRatioPattern(docText)
  if (s1 != null) {
    return NextResponse.json<ProxyResult>({ ratio: s1, method: 'regex_ratio', filingUrl, filingDate, rawText: '' })
  }

  // Strategy 2
  const s2 = extractTimesPattern(docText)
  if (s2 != null) {
    return NextResponse.json<ProxyResult>({ ratio: s2, method: 'regex_times', filingUrl, filingDate, rawText: '' })
  }

  // Strategy 3
  const s3 = extractCalculated(docText)
  if (s3 != null) {
    return NextResponse.json<ProxyResult>({ ratio: s3, method: 'calculated', filingUrl, filingDate, rawText: '' })
  }

  // Strategy 4 — Claude API on relevant excerpt
  const payRatioIdx = docText.search(/pay\s+ratio|ceo\s+pay|median\s+employee/i)
  let excerpt = ''
  if (payRatioIdx !== -1) {
    excerpt = docText.slice(Math.max(0, payRatioIdx - 100), payRatioIdx + 900)
  }
  if (excerpt) {
    const s4 = await extractViaClaude(excerpt)
    if (s4 != null) {
      return NextResponse.json<ProxyResult>({ ratio: s4, method: 'claude', filingUrl, filingDate, rawText: excerpt.slice(0, 500) })
    }
  }

  return NextResponse.json<ProxyResult>({ ratio: null, method: 'not_found', filingUrl, filingDate, rawText: excerpt.slice(0, 500) })
}
