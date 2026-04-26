import { NextRequest, NextResponse } from 'next/server';
import { and, eq, inArray, ilike } from 'drizzle-orm';
import { db } from '@/lib/db';
import { companies, blocks, VIOLATION_CATEGORIES } from '@/db/schema';
import type { ViolationCategory } from '@/db/schema';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const search = searchParams.get('search')?.trim() ?? '';
  const category = searchParams.get('category')?.trim() ?? '';
  const tier = searchParams.get('tier')?.trim() ?? '';

  try {
    const conditions = [];

    if (search) {
      conditions.push(ilike(companies.name, `%${search}%`));
    }

    if (tier) {
      const tierNum = parseInt(tier, 10);
      if (!isNaN(tierNum) && tierNum >= 1 && tierNum <= 5) {
        conditions.push(eq(companies.tier, tierNum));
      }
    }

    // category filter: return only companies that have at least one violation
    // in the requested category
    if (category && (VIOLATION_CATEGORIES as readonly string[]).includes(category)) {
      const matching = await db
        .selectDistinct({ companyId: blocks.companyId })
        .from(blocks)
        .where(eq(blocks.category, category as ViolationCategory));

      const ids = matching.map((v) => v.companyId);
      if (ids.length === 0) return NextResponse.json([]);
      conditions.push(inArray(companies.id, ids));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const results = await db
      .select({
        id: companies.id,
        name: companies.name,
        slug: companies.slug,
        tier: companies.tier,
      })
      .from(companies)
      .where(where)
      .limit(20);

    return NextResponse.json(results);
  } catch (err) {
    console.error('[GET /api/companies]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
