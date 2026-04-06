import { NextRequest, NextResponse } from 'next/server'
import Database from 'better-sqlite3'
import path from 'path'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const name = searchParams.get('name')
  const ticker = searchParams.get('ticker')

  if (!name && !ticker) {
    return NextResponse.json({ error: 'name or ticker required' }, { status: 400 })
  }

  try {
    const db = new Database(path.join(process.cwd(), 'omen.db'), { readonly: true })

    // Find the company
    let company
    if (ticker) {
      company = db.prepare('SELECT * FROM companies WHERE UPPER(ticker) = UPPER(?)').get(ticker)
    }
    if (!company && name) {
      // Try exact match first, then partial
      company = db.prepare('SELECT * FROM companies WHERE LOWER(name) = LOWER(?)').get(name)
      if (!company) {
        company = db.prepare("SELECT * FROM companies WHERE LOWER(name) LIKE LOWER('%' || ? || '%')").get(name)
      }
    }

    if (!company) {
      return NextResponse.json({ found: false, message: 'Company not found in OMEN ledger' })
    }

    // Get all blocks for this company
    const blocks = db.prepare(`
      SELECT category, amount, violation_tag, violation_date, formal_summary
      FROM blocks
      WHERE company_id = ?
      ORDER BY violation_date DESC
    `).all((company as any).id)

    // Calculate totals
    const totalFines = (blocks as any[]).reduce((sum, b) => {
      const amt = parseFloat(b.amount) || 0
      return sum + amt
    }, 0)

    const violationsByCategory = (blocks as any[]).reduce((acc, b) => {
      acc[b.category] = (acc[b.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const tagCounts = (blocks as any[]).reduce((acc, b) => {
      if (b.violation_tag) acc[b.violation_tag] = (acc[b.violation_tag] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    db.close()

    return NextResponse.json({
      found: true,
      company: {
        name: (company as any).name,
        ticker: (company as any).ticker,
        tier: (company as any).tier,
      },
      summary: {
        totalViolations: (blocks as any[]).length,
        totalFines,
        violationsByCategory,
        tagCounts,
        mostRecentViolation: (blocks as any[])[0]?.violation_date || null,
        recentViolations: (blocks as any[]).slice(0, 3).map(b => ({
          category: b.category,
          amount: b.amount,
          date: b.violation_date,
          summary: b.formal_summary?.slice(0, 120) + '...'
        }))
      }
    })

  } catch (err) {
    console.error('[violations-summary]', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
