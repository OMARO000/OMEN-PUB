import { NextRequest, NextResponse } from 'next/server';
import { eq, or, ilike } from 'drizzle-orm';
import { db } from '@/lib/db';
import { companies, blocks } from '@/db/schema';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get('name');
  const ticker = searchParams.get('ticker');

  if (!name && !ticker) {
    return NextResponse.json({ error: 'name or ticker required' }, { status: 400 });
  }

  try {
    let companyRows;

    if (ticker) {
      companyRows = await db
        .select()
        .from(companies)
        .where(ilike(companies.ticker, ticker))
        .limit(1);
    }

    if ((!companyRows || companyRows.length === 0) && name) {
      companyRows = await db
        .select()
        .from(companies)
        .where(
          or(
            ilike(companies.name, name),
            ilike(companies.name, `%${name}%`),
          )!
        )
        .limit(1);
    }

    if (!companyRows || companyRows.length === 0) {
      return NextResponse.json({ found: false, message: 'Company not found in OMEN ledger' });
    }

    const company = companyRows[0];

    const blockRows = await db
      .select({
        category: blocks.category,
        amount: blocks.amount,
        violationTag: blocks.violationTag,
        violationDate: blocks.violationDate,
        formalSummary: blocks.formalSummary,
      })
      .from(blocks)
      .where(eq(blocks.companyId, company.id));

    const totalFines = blockRows.reduce((sum, b) => sum + (b.amount ?? 0), 0);

    const violationsByCategory = blockRows.reduce((acc, b) => {
      acc[b.category] = (acc[b.category] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const tagCounts = blockRows.reduce((acc, b) => {
      if (b.violationTag) acc[b.violationTag] = (acc[b.violationTag] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const sorted = [...blockRows].sort((a, b) =>
      (b.violationDate ?? '').localeCompare(a.violationDate ?? '')
    );

    return NextResponse.json({
      found: true,
      company: {
        name: company.name,
        ticker: company.ticker,
        tier: company.tier,
      },
      summary: {
        totalViolations: blockRows.length,
        totalFines,
        violationsByCategory,
        tagCounts,
        mostRecentViolation: sorted[0]?.violationDate ?? null,
        recentViolations: sorted.slice(0, 3).map((b) => ({
          category: b.category,
          amount: b.amount,
          date: b.violationDate,
          summary: (b.formalSummary?.slice(0, 120) ?? '') + '...',
        })),
      },
    });
  } catch (err) {
    console.error('[violations-summary]', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
