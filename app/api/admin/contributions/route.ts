import { NextRequest, NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { contributions } from '@/db/schema';

const ADMIN_COOKIE = 'omen_admin_token';

function isAdminAuthed(request: NextRequest): boolean {
  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  const secret = process.env.ADMIN_SECRET;
  return !!(secret && token === secret);
}

export async function GET(request: NextRequest) {
  if (!isAdminAuthed(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const status = request.nextUrl.searchParams.get('status') ?? 'pending';

  const rows = await db
    .select()
    .from(contributions)
    .where(eq(contributions.status, status as 'pending' | 'approved' | 'rejected' | 'paid'))
    .orderBy(desc(contributions.createdAt));

  return NextResponse.json({ contributions: rows });
}
