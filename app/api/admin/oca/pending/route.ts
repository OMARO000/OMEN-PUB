import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { alternatives } from '@/db/schema';

const ADMIN_COOKIE = 'omen_admin_token';

export async function GET(request: NextRequest) {
  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  const secret = process.env.ADMIN_SECRET;

  if (!secret || token !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(alternatives)
    .where(eq(alternatives.status, 'pending'));

  return NextResponse.json({ alternatives: rows });
}
