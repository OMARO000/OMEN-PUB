import { NextRequest, NextResponse } from 'next/server';
import { eq, asc, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { alternatives } from '@/db/schema';
import { rankAlternatives } from '@/lib/oca/ranking';
import type { OcaCategory } from '@/db/schema';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const category = searchParams.get('category') as OcaCategory | null;
  const sort = searchParams.get('sort') ?? 'voted'; // 'voted' | 'newest' | 'alpha'

  let query = db
    .select()
    .from(alternatives)
    .where(eq(alternatives.status, 'approved'));

  const rows = await query;

  // Filter by category if provided
  const filtered = category
    ? rows.filter((r) => r.category === category)
    : rows;

  // Sort
  if (sort === 'newest') {
    filtered.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
    return NextResponse.json({ alternatives: filtered });
  }

  if (sort === 'alpha') {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json({ alternatives: filtered });
  }

  // Default: 'voted' — use ranking algorithm
  const ranked = await rankAlternatives(filtered);
  return NextResponse.json({ alternatives: ranked });
}
