import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { blocks } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const domain = searchParams.get('domain');

  if (!domain) {
    return NextResponse.json({ error: 'domain parameter required' }, { status: 400 });
  }

  const results = await db
    .select()
    .from(blocks)
    .where(and(eq(blocks.domain, domain), eq(blocks.domainVerified, true)));

  return NextResponse.json(results);
}
