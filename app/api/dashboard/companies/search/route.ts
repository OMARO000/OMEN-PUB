import { NextRequest, NextResponse } from 'next/server';
import { like, or } from 'drizzle-orm';
import { db } from '@/lib/db';
import { companies } from '@/db/schema';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';

  if (!q) {
    return NextResponse.json({ companies: [] });
  }

  const pattern = `%${q}%`;

  const rows = await db
    .select({ id: companies.id, name: companies.name, ticker: companies.ticker, slug: companies.slug })
    .from(companies)
    .where(or(like(companies.name, pattern), like(companies.ticker, pattern)))
    .limit(20);

  return NextResponse.json({ companies: rows });
}
