import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { alternatives } from '@/db/schema';
import { ocaModerateSchema } from '@/lib/validations';

const ADMIN_COOKIE = 'omen_admin_token';

export async function POST(request: NextRequest) {
  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  const secret = process.env.ADMIN_SECRET;

  if (!secret || token !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const result = ocaModerateSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const { alternativeId, action, reason } = result.data;

  const altRows = await db
    .select({ id: alternatives.id })
    .from(alternatives)
    .where(eq(alternatives.id, alternativeId))
    .limit(1);

  if (altRows.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await db
    .update(alternatives)
    .set({
      status: action === 'approve' ? 'approved' : 'rejected',
      rejectionReason: action === 'reject' ? (reason ?? null) : null,
    })
    .where(eq(alternatives.id, alternativeId));

  return NextResponse.json({ success: true });
}
