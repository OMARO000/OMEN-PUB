import { NextResponse } from 'next/server';
import { eq, count, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { companies, blocks } from '@/db/schema';

export async function GET() {
  const rows = await db
    .select({
      id: companies.id,
      name: companies.name,
      ticker: companies.ticker,
      slug: companies.slug,
      violationCount: count(blocks.id),
    })
    .from(companies)
    .leftJoin(blocks, eq(blocks.companyId, companies.id))
    .groupBy(companies.id)
    .orderBy(desc(count(blocks.id)))
    .limit(50);

  return NextResponse.json({ companies: rows });
}
