import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users, alternatives } from '@/db/schema';
import { ocaSubmitSchema } from '@/lib/validations';

export async function POST(request: NextRequest) {
  const accountNumber = request.cookies.get('omen_session')?.value;

  if (!accountNumber) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // isPaid required
  const userRows = await db
    .select({ isPaid: users.isPaid })
    .from(users)
    .where(eq(users.accountNumber, accountNumber))
    .limit(1);

  if (userRows.length === 0 || !userRows[0].isPaid) {
    return NextResponse.json({ error: 'Active subscription required' }, { status: 403 });
  }

  const body = await request.json();
  const result = ocaSubmitSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: result.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { name, category, websiteUrl, replaces, whyBetter, openSource, selfHostable } = result.data;

  await db.insert(alternatives).values({
    name,
    category,
    websiteUrl,
    replaces,
    whyBetter,
    openSource,
    selfHostable,
    status: 'pending',
    submittedBy: accountNumber,
  });

  return NextResponse.json({ success: true });
}
