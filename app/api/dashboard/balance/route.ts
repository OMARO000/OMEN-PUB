import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users } from '@/db/schema';

export async function GET(request: NextRequest) {
  const accountNumber = request.cookies.get('omen_session')?.value;
  if (!accountNumber) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const rows = await db
    .select({ bonusBalance: users.bonusBalance })
    .from(users)
    .where(eq(users.accountNumber, accountNumber))
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  }

  return NextResponse.json({ bonusBalance: rows[0].bonusBalance });
}
