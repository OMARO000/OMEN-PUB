import { NextRequest, NextResponse } from 'next/server';
import { withdrawSchema } from '@/lib/validations';
import { processPayout, PayoutError } from '@/lib/contributions/payout';

function getSession(request: NextRequest): string | null {
  return request.cookies.get('omen_session')?.value ?? null;
}

export async function POST(request: NextRequest) {
  const accountNumber = getSession(request);
  if (!accountNumber) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const result = withdrawSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: result.error.issues },
      { status: 400 },
    );
  }

  const { amount, payoutMethod, payoutAddress } = result.data;

  try {
    const { paymentId } = await processPayout(
      accountNumber,
      amount,
      payoutMethod,
      payoutAddress ?? null,
    );
    return NextResponse.json({ ok: true, paymentId }, { status: 201 });
  } catch (err) {
    if (err instanceof PayoutError) {
      const status = err.code === 'NOT_FOUND' ? 404 : 400;
      return NextResponse.json({ error: err.message, code: err.code }, { status });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
