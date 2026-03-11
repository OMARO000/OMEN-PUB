import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { contributions, users } from '@/db/schema';
import { adminReviewContributionSchema } from '@/lib/validations';
import { calculateReward } from '@/lib/contributions/rewards';

const ADMIN_COOKIE = 'omen_admin_token';

function isAdminAuthed(request: NextRequest): boolean {
  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  const secret = process.env.ADMIN_SECRET;
  return !!(secret && token === secret);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminAuthed(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const contributionId = parseInt(id, 10);
  if (isNaN(contributionId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const result = adminReviewContributionSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: result.error.issues },
      { status: 400 },
    );
  }

  const { action, quality, rewardAmount: explicitReward, rejectionReason } = result.data;

  const rows = await db
    .select()
    .from(contributions)
    .where(eq(contributions.id, contributionId))
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Contribution not found' }, { status: 404 });
  }

  const contribution = rows[0];

  if (contribution.status !== 'pending') {
    return NextResponse.json({ error: 'Contribution already reviewed' }, { status: 409 });
  }

  if (action === 'approve') {
    const reward =
      explicitReward ??
      (quality ? calculateReward(contribution.type, quality) : 0);

    await db
      .update(contributions)
      .set({
        status: 'approved',
        rewardAmount: reward,
        reviewedAt: new Date(),
      })
      .where(eq(contributions.id, contributionId));

    // Credit bonus balance
    if (reward > 0) {
      const userRows = await db
        .select({ bonusBalance: users.bonusBalance })
        .from(users)
        .where(eq(users.accountNumber, contribution.accountNumber))
        .limit(1);

      if (userRows.length > 0) {
        await db
          .update(users)
          .set({ bonusBalance: userRows[0].bonusBalance + reward })
          .where(eq(users.accountNumber, contribution.accountNumber));
      }
    }

    return NextResponse.json({ ok: true, reward });
  } else {
    await db
      .update(contributions)
      .set({
        status: 'rejected',
        rejectionReason: rejectionReason ?? null,
        reviewedAt: new Date(),
      })
      .where(eq(contributions.id, contributionId));

    return NextResponse.json({ ok: true });
  }
}
