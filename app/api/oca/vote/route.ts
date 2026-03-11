import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users, alternatives, alternativeVotes } from '@/db/schema';
import { ocaVoteSchema } from '@/lib/validations';

export async function POST(request: NextRequest) {
  const accountNumber = request.cookies.get('omen_session')?.value;

  if (!accountNumber) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // isPaid required to vote
  const userRows = await db
    .select({ isPaid: users.isPaid })
    .from(users)
    .where(eq(users.accountNumber, accountNumber))
    .limit(1);

  if (userRows.length === 0 || !userRows[0].isPaid) {
    return NextResponse.json({ error: 'Active subscription required' }, { status: 403 });
  }

  const body = await request.json();
  const result = ocaVoteSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const { alternativeId, vote } = result.data;

  // Verify alternative exists and is approved
  const altRows = await db
    .select({ id: alternatives.id, upvotes: alternatives.upvotes, downvotes: alternatives.downvotes })
    .from(alternatives)
    .where(and(eq(alternatives.id, alternativeId), eq(alternatives.status, 'approved')))
    .limit(1);

  if (altRows.length === 0) {
    return NextResponse.json({ error: 'Alternative not found' }, { status: 404 });
  }

  const alt = altRows[0];

  // Check for existing vote
  const existingVote = await db
    .select({ id: alternativeVotes.id, vote: alternativeVotes.vote })
    .from(alternativeVotes)
    .where(
      and(
        eq(alternativeVotes.alternativeId, alternativeId),
        eq(alternativeVotes.accountNumber, accountNumber),
      ),
    )
    .limit(1);

  let newUpvotes = alt.upvotes;
  let newDownvotes = alt.downvotes;

  if (existingVote.length > 0) {
    const prev = existingVote[0].vote;

    if (prev === vote) {
      // Same vote — no change
      return NextResponse.json({ success: true, upvotes: newUpvotes, downvotes: newDownvotes });
    }

    // Switching vote: undo previous, apply new
    if (prev === 'up') newUpvotes = Math.max(0, newUpvotes - 1);
    if (prev === 'down') newDownvotes = Math.max(0, newDownvotes - 1);
    if (vote === 'up') newUpvotes += 1;
    if (vote === 'down') newDownvotes += 1;

    await db
      .update(alternativeVotes)
      .set({ vote, createdAt: new Date() })
      .where(eq(alternativeVotes.id, existingVote[0].id));
  } else {
    // New vote
    if (vote === 'up') newUpvotes += 1;
    if (vote === 'down') newDownvotes += 1;

    await db.insert(alternativeVotes).values({
      alternativeId,
      accountNumber,
      vote,
    });
  }

  await db
    .update(alternatives)
    .set({ upvotes: newUpvotes, downvotes: newDownvotes })
    .where(eq(alternatives.id, alternativeId));

  return NextResponse.json({ success: true, upvotes: newUpvotes, downvotes: newDownvotes });
}
