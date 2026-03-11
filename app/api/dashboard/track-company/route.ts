import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users } from '@/db/schema';

export async function POST(request: NextRequest) {
  const accountNumber = request.cookies.get('omen_session')?.value;

  if (!accountNumber) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json();
  const ticker: string = typeof body.ticker === 'string' ? body.ticker.toUpperCase().trim() : '';
  const action: string = body.action === 'remove' ? 'remove' : 'add';

  if (!ticker) {
    return NextResponse.json({ error: 'Invalid ticker' }, { status: 400 });
  }

  const userRows = await db
    .select({ id: users.id, companiesTracked: users.companiesTracked })
    .from(users)
    .where(eq(users.accountNumber, accountNumber))
    .limit(1);

  if (userRows.length === 0) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const user = userRows[0];
  let tracked: string[] = [];

  try {
    tracked = JSON.parse(user.companiesTracked ?? '[]');
  } catch {
    tracked = [];
  }

  if (action === 'add') {
    if (!tracked.includes(ticker)) {
      tracked.push(ticker);
    }
  } else {
    tracked = tracked.filter((t) => t !== ticker);
  }

  await db
    .update(users)
    .set({ companiesTracked: JSON.stringify(tracked) })
    .where(eq(users.id, user.id));

  return NextResponse.json({ success: true, tracked });
}
