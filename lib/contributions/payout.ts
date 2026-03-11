import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users, contributionPayments } from '@/db/schema';
import type { PayoutMethod } from '@/db/schema';

export const MINIMUM_PAYOUT = 10;

export class PayoutError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'PayoutError';
  }
}

export async function processPayout(
  accountNumber: string,
  amount: number,
  payoutMethod: PayoutMethod,
  payoutAddress: string | null,
): Promise<{ paymentId: number }> {
  if (amount < MINIMUM_PAYOUT) {
    throw new PayoutError(
      `Minimum payout is $${MINIMUM_PAYOUT}`,
      'BELOW_MINIMUM',
    );
  }

  if (payoutMethod === 'FIAT') {
    throw new PayoutError(
      'Fiat payouts require manual processing. Contact support.',
      'FIAT_MANUAL_ONLY',
    );
  }

  const userRows = await db
    .select({ bonusBalance: users.bonusBalance })
    .from(users)
    .where(eq(users.accountNumber, accountNumber))
    .limit(1);

  if (userRows.length === 0) {
    throw new PayoutError('Account not found', 'NOT_FOUND');
  }

  const { bonusBalance } = userRows[0];

  if (bonusBalance < amount) {
    throw new PayoutError(
      `Insufficient balance. Available: $${bonusBalance.toFixed(2)}`,
      'INSUFFICIENT_BALANCE',
    );
  }

  // Deduct from balance
  await db
    .update(users)
    .set({ bonusBalance: bonusBalance - amount })
    .where(eq(users.accountNumber, accountNumber));

  // Record the payment request
  const result = await db
    .insert(contributionPayments)
    .values({
      accountNumber,
      amount,
      payoutMethod,
      payoutAddress: payoutAddress ?? null,
      status: 'pending',
      requestedAt: new Date(),
    })
    .returning({ id: contributionPayments.id });

  return { paymentId: result[0].id };
}
