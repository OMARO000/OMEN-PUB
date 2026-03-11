import { NextRequest, NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { contributions } from '@/db/schema';

function getSession(request: NextRequest): string | null {
  return request.cookies.get('omen_session')?.value ?? null;
}

export async function GET(request: NextRequest) {
  const accountNumber = getSession(request);
  if (!accountNumber) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rows = await db
    .select({
      id: contributions.id,
      type: contributions.type,
      title: contributions.title,
      status: contributions.status,
      rewardAmount: contributions.rewardAmount,
      rejectionReason: contributions.rejectionReason,
      reviewedAt: contributions.reviewedAt,
      createdAt: contributions.createdAt,
    })
    .from(contributions)
    .where(eq(contributions.accountNumber, accountNumber))
    .orderBy(desc(contributions.createdAt));

  return NextResponse.json({ contributions: rows });
}
